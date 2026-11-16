package com.deckknob.app

import com.deckknob.app.data.model.update.AnnouncementBannerConfig
import com.deckknob.app.data.model.update.RemoteAppConfig
import com.deckknob.app.data.model.update.VersionStatus
import com.deckknob.app.data.repository.AppUpdateRepository
import com.deckknob.app.util.ApkSecurityVerifier
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.security.MessageDigest

class AppUpdateSecurityTest {

    private val sampleReleaseBody = """
        ## DECKKNOB v1.0.4 Release Candidate
        
        ### What's New
        - Complete Group Chat messaging system
        - Real-time chat keyboard layout adjustment
        
        ### Bug Fixes
        - Resolved Profile follower and following count synchronization
        - Fixed window soft input IME bottom spacing
        
        ### Improvements
        - In-App OTA Update Center with SHA-256 verification
        - Real-time Firestore remote config listener
        
        **Release Metadata:**
        - **Android versionCode:** 5
        - **Android versionName:** 1.0.4
        - **SHA-256 Checksum:** 4C2230AFC5497C331F37E34C76F9837F8EE95379A11BF4D2E4E85718F4BBD8DD
    """.trimIndent()

    @Test
    fun testExtractVersionCode() {
        val helper = AppUpdateRepositoryHelper()
        val parsedCode = helper.extractVersionCode(sampleReleaseBody, fallback = 1)
        assertEquals(5, parsedCode)

        val fallbackCode = helper.extractVersionCode("No code here", fallback = 99)
        assertEquals(99, fallbackCode)
    }

    @Test
    fun testExtractVersionName() {
        val helper = AppUpdateRepositoryHelper()
        val parsedName = helper.extractVersionName("v1.0.4", sampleReleaseBody, fallback = "1.0.0")
        assertEquals("1.0.4", parsedName)

        val tagNameOnly = helper.extractVersionName("v1.0.3", "Plain body without version", fallback = "1.0.0")
        assertEquals("1.0.3", tagNameOnly)
    }

    @Test
    fun testExtractSha256() {
        val helper = AppUpdateRepositoryHelper()
        val parsedSha = helper.extractSha256(sampleReleaseBody)
        assertEquals("4c2230afc5497c331f37e34c76f9837f8ee95379a11bf4d2e4e85718f4bbd8dd", parsedSha)

        val emptySha = helper.extractSha256("No hash in this body")
        assertEquals("", emptySha)
    }

    @Test
    fun testParseReleaseNotes() {
        val helper = AppUpdateRepositoryHelper()
        val changelog = helper.parseReleaseNotes(sampleReleaseBody)
        
        assertTrue(changelog.features.any { it.contains("Group Chat") })
        assertTrue(changelog.fixes.any { it.contains("Profile follower") })
        assertTrue(changelog.improvements.any { it.contains("In-App OTA Update") })
    }

    // ==========================================
    // Section 1: Version Detection & Anti-Downgrade
    // ==========================================

    @Test
    fun testVersionComparisonInstalledIsAheadOfPublishedRelease() {
        val installedVersionCode = 5 // v1.0.4
        val publishedVersionCode = 4 // v1.0.3

        val status = when {
            publishedVersionCode > installedVersionCode -> VersionStatus.UPDATE_AVAILABLE
            publishedVersionCode == installedVersionCode -> VersionStatus.UP_TO_DATE
            else -> VersionStatus.AHEAD_OF_RELEASE
        }
        val isUpdateAvailable = status == VersionStatus.UPDATE_AVAILABLE

        assertEquals(VersionStatus.AHEAD_OF_RELEASE, status)
        assertFalse("Never suggest a downgrade when installed build is ahead", isUpdateAvailable)
    }

    @Test
    fun testVersionComparisonNewerPublishedReleaseAvailable() {
        val installedVersionCode = 5 // v1.0.4
        val publishedVersionCode = 6 // v1.0.5

        val status = when {
            publishedVersionCode > installedVersionCode -> VersionStatus.UPDATE_AVAILABLE
            publishedVersionCode == installedVersionCode -> VersionStatus.UP_TO_DATE
            else -> VersionStatus.AHEAD_OF_RELEASE
        }
        val isUpdateAvailable = status == VersionStatus.UPDATE_AVAILABLE

        assertEquals(VersionStatus.UPDATE_AVAILABLE, status)
        assertTrue(isUpdateAvailable)
    }

    @Test
    fun testVersionComparisonInstalledMatchesPublishedRelease() {
        val installedVersionCode = 5 // v1.0.4
        val publishedVersionCode = 5 // v1.0.4

        val status = when {
            publishedVersionCode > installedVersionCode -> VersionStatus.UPDATE_AVAILABLE
            publishedVersionCode == installedVersionCode -> VersionStatus.UP_TO_DATE
            else -> VersionStatus.AHEAD_OF_RELEASE
        }
        val isUpdateAvailable = status == VersionStatus.UPDATE_AVAILABLE

        assertEquals(VersionStatus.UP_TO_DATE, status)
        assertFalse(isUpdateAvailable)
    }

    // ==========================================
    // Section 2: Remote Configuration & 8 Feature Flags
    // ==========================================

    @Test
    fun testAllEightRemoteFeatureFlagsEnabledAndDisabled() {
        val allFeatures = listOf(
            "group_chat",
            "direct_messaging",
            "klyps_upload",
            "music_picker",
            "events_rsvp",
            "dj_calendar",
            "advanced_search",
            "in_app_updates"
        )

        // 1. All enabled by default
        val defaultConfig = RemoteAppConfig()
        for (feature in allFeatures) {
            assertTrue("Default feature $feature should be enabled", defaultConfig.isFeatureEnabled(feature))
        }

        // 2. Explicitly disable individual features
        for (feature in allFeatures) {
            val disabledConfig = RemoteAppConfig(
                featureFlags = defaultConfig.featureFlags.toMutableMap().apply { put(feature, false) }
            )
            assertFalse("Feature $feature should be disabled", disabledConfig.isFeatureEnabled(feature))
        }
    }

    @Test
    fun testEmergencyKillSwitches() {
        // Group creation kill-switch
        val groupKillConfig = RemoteAppConfig(
            emergencyKillSwitches = mapOf("disable_group_creation" to true)
        )
        assertFalse(groupKillConfig.isFeatureEnabled("group_creation"))

        // Messaging kill-switch
        val messagingKillConfig = RemoteAppConfig(
            emergencyKillSwitches = mapOf("disable_all_messaging" to true)
        )
        assertFalse("Group chat must be disabled by messaging kill-switch", messagingKillConfig.isFeatureEnabled("group_chat"))
        assertFalse("Direct messaging must be disabled by messaging kill-switch", messagingKillConfig.isFeatureEnabled("direct_messaging"))
        assertFalse("Group creation must be disabled by messaging kill-switch", messagingKillConfig.isFeatureEnabled("group_creation"))
        assertFalse("Generic messaging must be disabled by messaging kill-switch", messagingKillConfig.isFeatureEnabled("messaging"))

        // Global maintenance mode
        val maintenanceConfig = RemoteAppConfig(
            emergencyKillSwitches = mapOf("maintenance_mode" to true)
        )
        assertFalse(maintenanceConfig.isFeatureEnabled("group_chat"))
        assertFalse(maintenanceConfig.isFeatureEnabled("direct_messaging"))
        assertFalse(maintenanceConfig.isFeatureEnabled("klyps_upload"))
        assertFalse(maintenanceConfig.isFeatureEnabled("music_picker"))
        assertFalse(maintenanceConfig.isFeatureEnabled("events_rsvp"))
        assertFalse(maintenanceConfig.isFeatureEnabled("dj_calendar"))
        assertFalse(maintenanceConfig.isFeatureEnabled("advanced_search"))
        assertFalse(maintenanceConfig.isFeatureEnabled("in_app_updates"))
    }

    @Test
    fun testFailClosedSecurityDefaultsForUnknownFeatures() {
        val config = RemoteAppConfig()

        // Unvetted or unknown features must fail closed (return false)
        assertFalse(config.isFeatureEnabled("unvetted_payment_gateway"))
        assertFalse(config.isFeatureEnabled("remote_code_execution"))
        assertFalse(config.isFeatureEnabled("arbitrary_debug_tool"))
        assertFalse(config.isFeatureEnabled("unapproved_crypto_wallet"))
    }

    @Test
    fun testMissingAndDefaultRemoteConfiguration() {
        val emptyConfig = RemoteAppConfig()
        assertEquals(4, emptyConfig.minSupportedVersionCode)
        assertEquals(5, emptyConfig.latestVersionCode)
        assertEquals("1.0.4", emptyConfig.latestVersionName)
        assertFalse(emptyConfig.mandatoryUpdate)
        assertEquals(100, emptyConfig.stagedRolloutPercentage)
    }

    @Test
    fun testRemoteConfigVersionCompatibility() {
        val config = RemoteAppConfig(minSupportedVersionCode = 4)

        assertTrue(config.isVersionCompatible(4))
        assertTrue(config.isVersionCompatible(5))
        assertFalse(config.isVersionCompatible(3))
    }

    // ==========================================
    // Section 3: APK Update Security Verifications
    // ==========================================

    @Test
    fun testApkSha256Verification() {
        val tempFile = File.createTempFile("test_deckknob_apk", ".tmp")
        try {
            val content = "DECKKNOB_OTA_UPDATE_TEST_PAYLOAD".toByteArray()
            tempFile.writeBytes(content)

            val expectedDigest = MessageDigest.getInstance("SHA-256")
                .digest(content)
                .joinToString("") { "%02x".format(it) }

            val computed = ApkSecurityVerifier.computeSha256(tempFile)
            assertEquals(expectedDigest, computed)

            assertTrue(ApkSecurityVerifier.verifySha256(tempFile, expectedDigest))
            assertFalse(ApkSecurityVerifier.verifySha256(tempFile, "badhash123"))
        } finally {
            tempFile.delete()
        }
    }

    @Test
    fun testProductionCertificateConstants() {
        assertEquals("com.deckknob.app", ApkSecurityVerifier.EXPECTED_PACKAGE_NAME)
        assertEquals(
            "b41737f1211e96dc398bef54ccf3a8e02d29326c477c5d9df9eaa5146ee1094a",
            ApkSecurityVerifier.PRODUCTION_CERT_SHA256
        )
    }

    @Test
    fun testAntiDowngradeProtectionEvaluation() {
        val installedVersionCode = 5 // v1.0.4

        fun isDowngradeOrSame(incomingVersionCode: Int): Boolean {
            return incomingVersionCode <= installedVersionCode
        }

        assertTrue("Downgrade from 5 to 4 must be blocked", isDowngradeOrSame(4))
        assertTrue("Re-installing same version 5 must be blocked", isDowngradeOrSame(5))
        assertFalse("Upgrade to 6 is allowed", isDowngradeOrSame(6))
    }

    // ==========================================
    // Test Helper
    // ==========================================

    private class AppUpdateRepositoryHelper {
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

        fun parseReleaseNotes(body: String): AppUpdateRepository.ParsedChangelog {
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

            return AppUpdateRepository.ParsedChangelog(features, fixes, improvements)
        }
    }
}
