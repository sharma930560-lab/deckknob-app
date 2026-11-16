package com.deckknob.app.ui.settings

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.deckknob.app.BuildConfig
import com.deckknob.app.data.model.update.*
import com.deckknob.app.data.repository.AppUpdateRepository
import com.deckknob.app.data.repository.RemoteConfigRepository
import com.deckknob.app.util.ApkDownloadManager
import com.deckknob.app.util.ApkInstaller
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.File
import javax.inject.Inject

@HiltViewModel
class UpdateCenterViewModel @Inject constructor(
    private val appUpdateRepository: AppUpdateRepository,
    private val remoteConfigRepository: RemoteConfigRepository,
    private val downloadManager: ApkDownloadManager,
    private val apkInstaller: ApkInstaller
) : ViewModel() {

    val remoteConfig: StateFlow<RemoteAppConfig> = remoteConfigRepository.config

    private val _updateInfo = MutableStateFlow<AppUpdateInfo?>(null)
    val updateInfo: StateFlow<AppUpdateInfo?> = _updateInfo.asStateFlow()

    private val _downloadProgress = MutableStateFlow(DownloadProgress())
    val downloadProgress: StateFlow<DownloadProgress> = _downloadProgress.asStateFlow()

    var isChecking by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)
    var showWhatsNewDialog by mutableStateOf(false)
    var showInstallConfirmDialog by mutableStateOf(false)
    var showPermissionRationaleDialog by mutableStateOf(false)
    var verifiedApkFile by mutableStateOf<File?>(null)

    val installedVersionName: String = BuildConfig.VERSION_NAME
    val installedVersionCode: Int = BuildConfig.VERSION_CODE

    init {
        checkForUpdates()
        checkInitialWhatsNew()
    }

    private fun checkInitialWhatsNew() {
        viewModelScope.launch {
            appUpdateRepository.hasSeenCurrentWhatsNew.collect { hasSeen ->
                if (!hasSeen) {
                    showWhatsNewDialog = true
                }
            }
        }
    }

    fun checkForUpdates() {
        viewModelScope.launch {
            isChecking = true
            errorMessage = null
            remoteConfigRepository.refreshConfig()
            val result = appUpdateRepository.checkForUpdates()
            result.fold(
                onSuccess = { info ->
                    _updateInfo.value = info
                    isChecking = false
                },
                onFailure = { e ->
                    errorMessage = "Update check failed: ${e.message}"
                    isChecking = false
                }
            )
        }
    }

    fun startDownload() {
        val info = _updateInfo.value ?: return
        if (info.apkUrl.isBlank()) {
            errorMessage = "No direct APK asset available for this release."
            return
        }

        viewModelScope.launch {
            errorMessage = null
            downloadManager.downloadAndVerifyApk(
                downloadUrl = info.apkUrl,
                expectedSha256 = info.apkSha256,
                expectedVersionCode = info.latestVersionCode
            ).collect { progress ->
                _downloadProgress.value = progress
                if (progress.state == DownloadState.READY_TO_INSTALL && progress.downloadedFile != null) {
                    verifiedApkFile = progress.downloadedFile
                    showInstallConfirmDialog = true
                } else if (progress.state == DownloadState.FAILED) {
                    errorMessage = progress.errorMessage ?: "Download and verification failed."
                }
            }
        }
    }

    fun confirmAndInstall(context: Context) {
        val file = verifiedApkFile ?: _downloadProgress.value.downloadedFile
        if (file == null || !file.exists()) {
            errorMessage = "Verified APK file not found."
            showInstallConfirmDialog = false
            return
        }

        if (apkInstaller.isInstalledFromPlayStore(context)) {
            apkInstaller.openPlayStore(context)
            showInstallConfirmDialog = false
            return
        }

        if (!apkInstaller.canRequestPackageInstalls(context)) {
            showInstallConfirmDialog = false
            showPermissionRationaleDialog = true
            return
        }

        val result = apkInstaller.installApk(context, file)
        result.onFailure { e ->
            errorMessage = "Installation failed: ${e.message}"
        }
        showInstallConfirmDialog = false
    }

    fun requestInstallPermission(context: Context) {
        showPermissionRationaleDialog = false
        apkInstaller.requestInstallPermission(context)
    }

    fun dismissWhatsNew() {
        showWhatsNewDialog = false
        viewModelScope.launch {
            appUpdateRepository.markWhatsNewSeen(installedVersionCode)
        }
    }

    fun showWhatsNewManually() {
        showWhatsNewDialog = true
    }
}
