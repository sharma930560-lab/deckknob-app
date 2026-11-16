package com.deckknob.app.data.model.update

import com.google.firebase.firestore.IgnoreExtraProperties

enum class UpdateSource {
    GITHUB,
    FIRESTORE,
    GOOGLE_PLAY
}

enum class VersionStatus {
    UP_TO_DATE,         // Installed version matches latest published stable release
    UPDATE_AVAILABLE,   // A newer published version is available for download
    AHEAD_OF_RELEASE,   // Installed build is ahead of latest published release (Local/Dev build)
    DOWNGRADE_REJECTED  // An older version was detected; downgrade rejected
}

@IgnoreExtraProperties
data class AppUpdateInfo(
    val installedVersionCode: Int = 0,
    val installedVersionName: String = "",
    val latestVersionCode: Int = 0,
    val latestVersionName: String = "",
    val releaseTitle: String = "",
    val releaseNotes: String = "",
    val newFeatures: List<String> = emptyList(),
    val bugFixes: List<String> = emptyList(),
    val improvements: List<String> = emptyList(),
    val apkUrl: String = "",
    val apkSize: Long = 0L,
    val apkSha256: String = "",
    val isUpdateAvailable: Boolean = false,
    val isMandatory: Boolean = false,
    val lastCheckedTimestamp: Long = 0L,
    val source: UpdateSource = UpdateSource.GITHUB,
    val versionStatus: VersionStatus = VersionStatus.UP_TO_DATE,
    val statusMessage: String = ""
)
