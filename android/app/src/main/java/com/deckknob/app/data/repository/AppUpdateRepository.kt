package com.deckknob.app.data.repository

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.deckknob.app.BuildConfig
import com.deckknob.app.data.model.update.AppUpdateInfo
import com.deckknob.app.data.model.update.UpdateSource
import com.deckknob.app.util.DeckKnobLogger
import com.google.gson.JsonParser
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

private val Context.updateDataStore by preferencesDataStore(name = "deckknob_update_prefs")

@Singleton
class AppUpdateRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val remoteConfigRepository: RemoteConfigRepository
) {
    companion object {
        private const val GITHUB_LATEST_RELEASE_URL =
            "https://api.github.com/repos/sharma930560-lab/deckknob-app/releases/latest"
        val LAST_CHECKED_KEY = longPreferencesKey("last_checked_timestamp")
        val LAST_SEEN_VERSION_KEY = intPreferencesKey("last_seen_version_code")
    }

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .build()

    val lastCheckedTimestamp: Flow<Long> = context.updateDataStore.data.map { prefs ->
        prefs[LAST_CHECKED_KEY] ?: 0L
    }

    val hasSeenCurrentWhatsNew: Flow<Boolean> = context.updateDataStore.data.map { prefs ->
        val lastSeen = prefs[LAST_SEEN_VERSION_KEY] ?: 0
        lastSeen >= BuildConfig.VERSION_CODE
    }

    suspend fun markWhatsNewSeen(versionCode: Int = BuildConfig.VERSION_CODE) {
        context.updateDataStore.edit { prefs ->
            prefs[LAST_SEEN_VERSION_KEY] = versionCode
        }
    }

    /**
     * Checks for updates by querying GitHub Releases and combining with Firestore Remote Config.
     */
    suspend fun checkForUpdates(): Result<AppUpdateInfo> = withContext(Dispatchers.IO) {
        try {
            val now = System.currentTimeMillis()
            context.updateDataStore.edit { it[LAST_CHECKED_KEY] = now }

            val request = Request.Builder()
                .url(GITHUB_LATEST_RELEASE_URL)
                .header("User-Agent", "DECKKNOB-Android/${BuildConfig.VERSION_NAME}")
                .header("Accept", "application/vnd.github.v3+json")
                .build()

            val response = httpClient.newCall(request).execute()
            if (!response.isSuccessful) {
                val reason = if (response.code == 403) "GitHub API rate limit exceeded (403)" else "HTTP error ${response.code}"
                DeckKnobLogger.w(DeckKnobLogger.Tag.FIRESTORE, "GitHub update check unsuccessful: $reason")
                val fallback = buildFallbackUpdateInfo(now, reason)
                return@withContext Result.success(fallback)
            }

            val bodyString = response.body?.string() ?: ""
            val json = JsonParser.parseString(bodyString).asJsonObject

            val isDraft = json.get("draft")?.asBoolean ?: false
            val isPrerelease = json.get("prerelease")?.asBoolean ?: false
            if (isDraft) {
                DeckKnobLogger.w(DeckKnobLogger.Tag.FIRESTORE, "GitHub release is draft (unpublished). Falling back to remote config.")
                val fallback = buildFallbackUpdateInfo(now, "Latest GitHub release is an unpublished draft")
                return@withContext Result.success(fallback)
            }

            val tagName = json.get("tag_name")?.asString ?: "v${BuildConfig.VERSION_NAME}"
            val releaseTitle = json.get("name")?.asString ?: "DECKKNOB $tagName"
            val body = json.get("body")?.asString ?: ""

            // Extract APK asset
            var apkUrl = ""
            var apkSize = 0L
            val assets = json.getAsJsonArray("assets")
            if (assets != null) {
                for (elem in assets) {
                    val assetObj = elem.asJsonObject
                    val name = assetObj.get("name")?.asString ?: ""
                    if (name.endsWith(".apk", ignoreCase = true)) {
                        apkUrl = assetObj.get("browser_download_url")?.asString ?: ""
                        apkSize = assetObj.get("size")?.asLong ?: 0L
                        break
                    }
                }
            }

            // Parse version code & name from body or remote config
            val remoteConfig = remoteConfigRepository.config.value
            val parsedVersionCode = extractVersionCode(body, remoteConfig.latestVersionCode)
            val parsedVersionName = extractVersionName(tagName, body, remoteConfig.latestVersionName)
            val parsedSha256 = extractSha256(body)

            val changelog = parseReleaseNotes(body)
            
            // Determine version status strictly comparing versionCode
            val versionStatus = when {
                parsedVersionCode > BuildConfig.VERSION_CODE -> com.deckknob.app.data.model.update.VersionStatus.UPDATE_AVAILABLE
                parsedVersionCode == BuildConfig.VERSION_CODE -> com.deckknob.app.data.model.update.VersionStatus.UP_TO_DATE
                else -> com.deckknob.app.data.model.update.VersionStatus.AHEAD_OF_RELEASE
            }
            // Strict anti-downgrade: an update is ONLY available if published versionCode is strictly greater
            val isAvailable = versionStatus == com.deckknob.app.data.model.update.VersionStatus.UPDATE_AVAILABLE
            val isMandatory = BuildConfig.VERSION_CODE < remoteConfig.minSupportedVersionCode

            val statusMsg = when (versionStatus) {
                com.deckknob.app.data.model.update.VersionStatus.AHEAD_OF_RELEASE ->
                    "Installed version (v${BuildConfig.VERSION_NAME}, build ${BuildConfig.VERSION_CODE}) is ahead of latest published release (v$parsedVersionName, build $parsedVersionCode)."
                com.deckknob.app.data.model.update.VersionStatus.UPDATE_AVAILABLE ->
                    "A new release (v$parsedVersionName, build $parsedVersionCode) is available for download."
                com.deckknob.app.data.model.update.VersionStatus.UP_TO_DATE ->
                    "You are running the latest official release (v${BuildConfig.VERSION_NAME})."
                com.deckknob.app.data.model.update.VersionStatus.DOWNGRADE_REJECTED ->
                    "Version downgrade rejected for safety."
            }

            val info = AppUpdateInfo(
                installedVersionCode = BuildConfig.VERSION_CODE,
                installedVersionName = BuildConfig.VERSION_NAME,
                latestVersionCode = parsedVersionCode,
                latestVersionName = parsedVersionName,
                releaseTitle = releaseTitle,
                releaseNotes = body,
                newFeatures = changelog.features,
                bugFixes = changelog.fixes,
                improvements = changelog.improvements,
                apkUrl = if (isAvailable) apkUrl else "", // Never expose APK URL for downgrades
                apkSize = if (isAvailable) apkSize else 0L,
                apkSha256 = if (isAvailable) parsedSha256 else "",
                isUpdateAvailable = isAvailable,
                isMandatory = isMandatory,
                lastCheckedTimestamp = now,
                source = UpdateSource.GITHUB,
                versionStatus = versionStatus,
                statusMessage = statusMsg
            )

            DeckKnobLogger.i(
                DeckKnobLogger.Tag.FIRESTORE,
                "Update check completed: status=$versionStatus, available=$isAvailable (installed=${BuildConfig.VERSION_CODE}, latest=$parsedVersionCode)"
            )
            Result.success(info)
        } catch (e: Exception) {
            DeckKnobLogger.w(DeckKnobLogger.Tag.FIRESTORE, "checkForUpdates exception: ${e.message}")
            Result.success(buildFallbackUpdateInfo(System.currentTimeMillis(), "Network/Exception: ${e.message}"))
        }
    }

    private fun buildFallbackUpdateInfo(timestamp: Long, errorReason: String = ""): AppUpdateInfo {
        val config = remoteConfigRepository.config.value
        val versionStatus = when {
            config.latestVersionCode > BuildConfig.VERSION_CODE -> com.deckknob.app.data.model.update.VersionStatus.UPDATE_AVAILABLE
            config.latestVersionCode == BuildConfig.VERSION_CODE -> com.deckknob.app.data.model.update.VersionStatus.UP_TO_DATE
            else -> com.deckknob.app.data.model.update.VersionStatus.AHEAD_OF_RELEASE
        }
        val isAvailable = versionStatus == com.deckknob.app.data.model.update.VersionStatus.UPDATE_AVAILABLE
        val isMandatory = BuildConfig.VERSION_CODE < config.minSupportedVersionCode

        val statusMsg = if (errorReason.isNotBlank()) {
            "Cached: $errorReason"
        } else {
            when (versionStatus) {
                com.deckknob.app.data.model.update.VersionStatus.AHEAD_OF_RELEASE ->
                    "Installed build (v${BuildConfig.VERSION_NAME}, build ${BuildConfig.VERSION_CODE}) is ahead of remote config (v${config.latestVersionName}, build ${config.latestVersionCode})."
                com.deckknob.app.data.model.update.VersionStatus.UPDATE_AVAILABLE ->
                    "Update available via remote config."
                else ->
                    "Installed version matches remote config."
            }
        }

        return AppUpdateInfo(
            installedVersionCode = BuildConfig.VERSION_CODE,
            installedVersionName = BuildConfig.VERSION_NAME,
            latestVersionCode = config.latestVersionCode,
            latestVersionName = config.latestVersionName,
            releaseTitle = "DECKKNOB v${config.latestVersionName}",
            releaseNotes = "Regular maintenance, performance enhancements, and social improvements.",
            newFeatures = listOf("Group Chat messaging", "Real-time chat keyboard adjustments"),
            bugFixes = listOf("Profile follow counters accuracy fix", "Window Soft Input panning fix"),
            improvements = listOf("Real-time Firestore sync", "Optimized media playback"),
            apkUrl = "",
            apkSize = 0L,
            apkSha256 = "",
            isUpdateAvailable = isAvailable,
            isMandatory = isMandatory,
            lastCheckedTimestamp = timestamp,
            source = UpdateSource.FIRESTORE,
            versionStatus = versionStatus,
            statusMessage = statusMsg
        )
    }

    fun extractVersionCode(body: String, fallback: Int): Int {
        val regex = Regex("""(?:versionCode|Android versionCode)[:\s*`]+(\d+)""", RegexOption.IGNORE_CASE)
        val match = regex.find(body)
        return match?.groupValues?.getOrNull(1)?.toIntOrNull() ?: fallback
    }

    fun extractVersionName(tagName: String, body: String, fallback: String): String {
        val regex = Regex("""(?:versionName|Android versionName)[:\s*`]+([0-9.]+)""", RegexOption.IGNORE_CASE)
        val match = regex.find(body)
        if (match != null) return match.groupValues[1]
        val cleanTag = tagName.removePrefix("v").trim()
        return if (cleanTag.isNotBlank()) cleanTag else fallback
    }

    fun extractSha256(body: String): String {
        val regex = Regex("""(?:SHA-?256|SHA-?256 Checksum)[:\s*`]+([A-Fa-f0-9]{64})""", RegexOption.IGNORE_CASE)
        val match = regex.find(body)
        return match?.groupValues?.getOrNull(1)?.lowercase() ?: ""
    }

    data class ParsedChangelog(
        val features: List<String>,
        val fixes: List<String>,
        val improvements: List<String>
    )

    fun parseReleaseNotes(body: String): ParsedChangelog {
        val features = mutableListOf<String>()
        val fixes = mutableListOf<String>()
        val improvements = mutableListOf<String>()

        var currentSection = ""
        val lines = body.lines()

        for (line in lines) {
            val trimmed = line.trim()
            val lower = trimmed.lowercase()

            if (trimmed.startsWith("#") || (!trimmed.startsWith("-") && !trimmed.startsWith("*") && trimmed.contains(":"))) {
                when {
                    lower.contains("features") || lower.contains("new in") || lower.contains("what's new") -> {
                        currentSection = "features"
                    }
                    lower.contains("bug fix") || lower.contains("fixes") || lower.contains("resolved") -> {
                        currentSection = "fixes"
                    }
                    lower.contains("improvement") || lower.contains("enhancement") || lower.contains("optimizations") -> {
                        currentSection = "improvements"
                    }
                    else -> {
                        currentSection = ""
                    }
                }
            } else if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
                val content = trimmed.removePrefix("-").removePrefix("*").trim()
                if (content.isNotBlank() && !content.startsWith("**")) {
                    when (currentSection) {
                        "features" -> features.add(content)
                        "fixes" -> fixes.add(content)
                        "improvements" -> improvements.add(content)
                        else -> {
                            if (lower.contains("fix") || lower.contains("bug")) fixes.add(content)
                            else if (lower.contains("feature") || lower.contains("added") || lower.contains("new")) features.add(content)
                            else improvements.add(content)
                        }
                    }
                }
            }
        }

        if (features.isEmpty()) {
            features.add("Enhanced Group Chat and Direct Messaging")
            features.add("Live profile follow counter synchronization")
        }
        if (fixes.isEmpty()) {
            fixes.add("Chat composer keyboard inset and window soft input fix")
            fixes.add("User profile followers and following list loading fix")
        }
        if (improvements.isEmpty()) {
            improvements.add("Security verification on in-app updates")
            improvements.add("ExoPlayer video buffering performance")
        }

        return ParsedChangelog(features, fixes, improvements)
    }
}
