package com.deckknob.app.data.repository

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.deckknob.app.data.model.update.AnnouncementBannerConfig
import com.deckknob.app.data.model.update.RemoteAppConfig
import com.deckknob.app.util.DeckKnobLogger
import com.google.firebase.firestore.FirebaseFirestore
import com.google.gson.Gson
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

private val Context.remoteConfigDataStore by preferencesDataStore(name = "deckknob_remote_config")

@Singleton
class RemoteConfigRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val firestore: FirebaseFirestore,
    private val gson: Gson
) {
    private val scope = CoroutineScope(Dispatchers.IO)
    private val CONFIG_CACHE_KEY = stringPreferencesKey("remote_app_config_json")

    private val _config = MutableStateFlow(RemoteAppConfig())
    val config: StateFlow<RemoteAppConfig> = _config.asStateFlow()

    private var listenerRegistration: com.google.firebase.firestore.ListenerRegistration? = null

    init {
        loadCachedConfig()
        observeRemoteConfig()
    }

    private fun loadCachedConfig() {
        scope.launch {
            try {
                val json = context.remoteConfigDataStore.data.first()[CONFIG_CACHE_KEY]
                if (!json.isNullOrBlank()) {
                    val cached = gson.fromJson(json, RemoteAppConfig::class.java)
                    if (cached != null) {
                        _config.value = cached
                    }
                }
            } catch (e: Exception) {
                DeckKnobLogger.w(DeckKnobLogger.Tag.FIRESTORE, "Failed to load cached remote config: ${e.message}")
            }
        }
    }

    fun observeRemoteConfig() {
        try {
            cleanupListener()
            listenerRegistration = firestore.collection("app_config")
                .document("android")
                .addSnapshotListener { snapshot, error ->
                    if (error != null) {
                        DeckKnobLogger.w(DeckKnobLogger.Tag.FIRESTORE, "Remote config listen error: ${error.message}")
                        return@addSnapshotListener
                    }
                    if (snapshot != null && snapshot.exists()) {
                        try {
                            val parsed = parseSnapshot(snapshot)
                            _config.value = parsed
                            persistConfig(parsed)
                        } catch (e: Exception) {
                            DeckKnobLogger.w(DeckKnobLogger.Tag.FIRESTORE, "Failed to parse remote config: ${e.message}")
                        }
                    }
                }
        } catch (e: Exception) {
            DeckKnobLogger.w(DeckKnobLogger.Tag.FIRESTORE, "Failed to register config listener: ${e.message}")
        }
    }

    fun cleanupListener() {
        listenerRegistration?.remove()
        listenerRegistration = null
    }

    fun reconnectListener() {
        observeRemoteConfig()
    }

    suspend fun refreshConfig(): Result<RemoteAppConfig> {
        return try {
            val snapshot = firestore.collection("app_config").document("android").get().await()
            if (snapshot.exists()) {
                val parsed = parseSnapshot(snapshot)
                _config.value = parsed
                persistConfig(parsed)
                Result.success(parsed)
            } else {
                Result.success(_config.value)
            }
        } catch (e: Exception) {
            DeckKnobLogger.w(DeckKnobLogger.Tag.FIRESTORE, "refreshConfig failed: ${e.message}")
            Result.failure(e)
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun parseSnapshot(snapshot: com.google.firebase.firestore.DocumentSnapshot): RemoteAppConfig {
        val minVer = snapshot.getLong("minSupportedVersionCode")?.toInt() ?: 4
        val latestVer = snapshot.getLong("latestVersionCode")?.toInt() ?: 5
        val latestName = snapshot.getString("latestVersionName") ?: "1.0.4"
        val mandatory = snapshot.getBoolean("mandatoryUpdate") ?: false

        val flagsMap = (snapshot.get("featureFlags") as? Map<String, Boolean>) ?: _config.value.featureFlags
        val killMap = (snapshot.get("emergencyKillSwitches") as? Map<String, Boolean>) ?: _config.value.emergencyKillSwitches
        val rollout = snapshot.getLong("stagedRolloutPercentage")?.toInt() ?: 100

        val bannerMap = snapshot.get("announcementBanner") as? Map<String, Any?>
        val banner = if (bannerMap != null && bannerMap["enabled"] == true) {
            AnnouncementBannerConfig(
                enabled = true,
                text = bannerMap["text"] as? String ?: "",
                type = bannerMap["type"] as? String ?: "info",
                actionUrl = bannerMap["actionUrl"] as? String,
                id = bannerMap["id"] as? String ?: ""
            )
        } else {
            null
        }

        return RemoteAppConfig(
            minSupportedVersionCode = minVer,
            latestVersionCode = latestVer,
            latestVersionName = latestName,
            mandatoryUpdate = mandatory,
            featureFlags = flagsMap,
            emergencyKillSwitches = killMap,
            announcementBanner = banner,
            stagedRolloutPercentage = rollout
        )
    }

    private fun persistConfig(config: RemoteAppConfig) {
        scope.launch {
            try {
                val json = gson.toJson(config)
                context.remoteConfigDataStore.edit { prefs ->
                    prefs[CONFIG_CACHE_KEY] = json
                }
            } catch (e: Exception) {
                // non-fatal
            }
        }
    }

    fun isFeatureEnabled(featureKey: String): Boolean {
        return _config.value.isFeatureEnabled(featureKey)
    }

    fun isVersionSupported(versionCode: Int): Boolean {
        return _config.value.isVersionCompatible(versionCode)
    }
}
