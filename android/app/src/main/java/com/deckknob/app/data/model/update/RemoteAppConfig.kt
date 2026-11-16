package com.deckknob.app.data.model.update

import com.google.firebase.firestore.IgnoreExtraProperties

@IgnoreExtraProperties
data class AnnouncementBannerConfig(
    val enabled: Boolean = false,
    val text: String = "",
    val type: String = "info", // "info", "warning", "critical"
    val actionUrl: String? = null,
    val id: String = ""
)

@IgnoreExtraProperties
data class RemoteModuleConfig(
    val id: String = "",
    val name: String = "",
    val version: String = "1.0.0",
    val url: String = "",
    val enabled: Boolean = false, // Security default: disabled until explicitly authorized
    val minNativeVersionCode: Int = 1
)

@IgnoreExtraProperties
data class RemoteAppConfig(
    val minSupportedVersionCode: Int = 4,
    val latestVersionCode: Int = 5,
    val latestVersionName: String = "1.0.4",
    val mandatoryUpdate: Boolean = false,
    val featureFlags: Map<String, Boolean> = SAFE_DEFAULT_FEATURE_FLAGS,
    val emergencyKillSwitches: Map<String, Boolean> = mapOf(
        "disable_group_creation" to false,
        "disable_all_messaging" to false,
        "maintenance_mode" to false
    ),
    val announcementBanner: AnnouncementBannerConfig? = null,
    val stagedRolloutPercentage: Int = 100,
    val remoteModules: Map<String, RemoteModuleConfig> = emptyMap()
) {
    companion object {
        val SAFE_DEFAULT_FEATURE_FLAGS = mapOf(
            "group_chat" to true,
            "direct_messaging" to true,
            "klyps_upload" to true,
            "music_picker" to true,
            "events_rsvp" to true,
            "dj_calendar" to true,
            "advanced_search" to true,
            "in_app_updates" to true
        )

        val MESSAGING_FEATURES = setOf(
            "group_chat",
            "direct_messaging",
            "group_creation",
            "messaging"
        )
    }

    /**
     * Checks whether a feature is permitted considering both its feature flag,
     * associated emergency kill-switches, and fail-closed security defaults.
     */
    fun isFeatureEnabled(featureKey: String): Boolean {
        // 1. App-wide Emergency Maintenance Mode -> Fail Closed
        if (emergencyKillSwitches["maintenance_mode"] == true) {
            return false
        }

        // 2. Messaging Kill-Switch -> Blocks all messaging & group interaction
        if (emergencyKillSwitches["disable_all_messaging"] == true) {
            if (featureKey in MESSAGING_FEATURES || featureKey == "all_messaging") {
                return false
            }
        }

        // 3. Group Creation Kill-Switch -> Blocks new group creation
        if (emergencyKillSwitches["disable_group_creation"] == true) {
            if (featureKey == "group_creation" || featureKey == "disable_group_creation") {
                return false
            }
        }

        // 4. Feature-Specific Emergency Kill-Switch
        val directKillKey = "disable_$featureKey"
        if (emergencyKillSwitches[directKillKey] == true) {
            return false
        }

        // 5. Fail-Closed Flag Resolution:
        // If explicitly set in remote featureFlags, respect the value.
        // If missing from remote config, fall back to safe default baseline.
        // Unknown/unvetted security-sensitive features default to FALSE (fail closed).
        return featureFlags[featureKey]
            ?: SAFE_DEFAULT_FEATURE_FLAGS[featureKey]
            ?: false
    }

    /**
     * Checks if current native app version meets minimum required version.
     */
    fun isVersionCompatible(installedVersionCode: Int): Boolean {
        return installedVersionCode >= minSupportedVersionCode
    }
}
