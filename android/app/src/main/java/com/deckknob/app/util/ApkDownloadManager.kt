package com.deckknob.app.util

import android.content.Context
import com.deckknob.app.BuildConfig
import com.deckknob.app.data.model.update.DownloadProgress
import com.deckknob.app.data.model.update.DownloadState
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ApkDownloadManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .build()

    /**
     * Downloads an APK over HTTPS and verifies its cryptographic integrity,
     * package name, anti-downgrade rules, and certificate fingerprint.
     */
    fun downloadAndVerifyApk(
        downloadUrl: String,
        expectedSha256: String = "",
        expectedVersionCode: Int = 0
    ): Flow<DownloadProgress> = flow {
        if (downloadUrl.isBlank()) {
            emit(DownloadProgress(state = DownloadState.FAILED, errorMessage = "Invalid download URL."))
            return@flow
        }

        emit(DownloadProgress(state = DownloadState.DOWNLOADING, percentage = 0))

        val updatesDir = File(context.cacheDir, "updates").apply { if (!exists()) mkdirs() }
        val targetFile = File(updatesDir, "deckknob-update.apk")
        if (targetFile.exists()) targetFile.delete()

        try {
            val request = Request.Builder()
                .url(downloadUrl)
                .header("User-Agent", "DECKKNOB-Android/${BuildConfig.VERSION_NAME}")
                .build()

            val response = httpClient.newCall(request).execute()
            if (!response.isSuccessful) {
                emit(DownloadProgress(state = DownloadState.FAILED, errorMessage = "HTTP error ${response.code} downloading update."))
                return@flow
            }

            val body = response.body
            if (body == null) {
                emit(DownloadProgress(state = DownloadState.FAILED, errorMessage = "Response body is empty."))
                return@flow
            }

            val totalBytes = body.contentLength()
            var bytesDownloaded = 0L

            body.byteStream().use { input ->
                FileOutputStream(targetFile).use { output ->
                    val buffer = ByteArray(8192)
                    var read: Int
                    var lastEmittedPercent = -1

                    while (input.read(buffer).also { read = it } != -1) {
                        output.write(buffer, 0, read)
                        bytesDownloaded += read

                        val percent = if (totalBytes > 0) ((bytesDownloaded * 100) / totalBytes).toInt() else 0
                        if (percent != lastEmittedPercent) {
                            lastEmittedPercent = percent
                            emit(
                                DownloadProgress(
                                    bytesDownloaded = bytesDownloaded,
                                    totalBytes = totalBytes,
                                    percentage = percent,
                                    state = DownloadState.DOWNLOADING
                                )
                            )
                        }
                    }
                    output.flush()
                }
            }

            // Step 2: Verification
            emit(DownloadProgress(state = DownloadState.VERIFYING, percentage = 100))

            val verification = ApkSecurityVerifier.verifyPackageArchive(
                context = context,
                apkFile = targetFile,
                expectedSha256 = expectedSha256,
                installedVersionCode = BuildConfig.VERSION_CODE
            )

            when (verification) {
                is SecurityVerificationResult.Success -> {
                    emit(
                        DownloadProgress(
                            bytesDownloaded = totalBytes,
                            totalBytes = totalBytes,
                            percentage = 100,
                            state = DownloadState.READY_TO_INSTALL,
                            downloadedFile = targetFile
                        )
                    )
                }
                is SecurityVerificationResult.Failure -> {
                    emit(
                        DownloadProgress(
                            state = DownloadState.FAILED,
                            errorMessage = "Security verification failed: ${verification.reason}"
                        )
                    )
                }
            }
        } catch (e: Exception) {
            targetFile.delete()
            emit(
                DownloadProgress(
                    state = DownloadState.FAILED,
                    errorMessage = "Download failed: ${e.message ?: "Unknown network error"}"
                )
            )
        }
    }.flowOn(Dispatchers.IO)
}
