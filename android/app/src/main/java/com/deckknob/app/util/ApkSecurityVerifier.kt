package com.deckknob.app.util

import android.content.Context
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.os.Build
import java.io.File
import java.io.FileInputStream
import java.security.MessageDigest

sealed class SecurityVerificationResult {
    data class Success(
        val sha256: String,
        val packageName: String,
        val versionCode: Int,
        val versionName: String
    ) : SecurityVerificationResult()

    data class Failure(val reason: String) : SecurityVerificationResult()
}

object ApkSecurityVerifier {

    const val EXPECTED_PACKAGE_NAME = "com.deckknob.app"
    const val PRODUCTION_CERT_SHA256 = "b41737f1211e96dc398bef54ccf3a8e02d29326c477c5d9df9eaa5146ee1094a"

    /**
     * Computes the SHA-256 hash of a file.
     */
    fun computeSha256(file: File): String {
        if (!file.exists() || file.length() == 0L) return ""
        val digest = MessageDigest.getInstance("SHA-256")
        FileInputStream(file).use { stream ->
            val buffer = ByteArray(8192)
            var bytesRead: Int
            while (stream.read(buffer).also { bytesRead = it } != -1) {
                digest.update(buffer, 0, bytesRead)
            }
        }
        return digest.digest().joinToString("") { "%02x".format(it) }
    }

    /**
     * Verifies that the file's SHA-256 matches the expected hash.
     */
    fun verifySha256(file: File, expectedSha256: String): Boolean {
        if (expectedSha256.isBlank()) return true
        val actual = computeSha256(file)
        return actual.equals(expectedSha256.trim(), ignoreCase = true)
    }

    /**
     * Inspects the APK file and performs comprehensive security checks:
     * 1. Integrity check (non-empty, valid archive).
     * 2. SHA-256 checksum match if expected hash is provided.
     * 3. Package name match (rejects foreign apps).
     * 4. Anti-downgrade protection (rejects version codes <= installed).
     * 5. Cryptographic signature check (must match DECKKNOB production cert).
     */
    fun verifyPackageArchive(
        context: Context,
        apkFile: File,
        expectedSha256: String = "",
        installedVersionCode: Int = 0
    ): SecurityVerificationResult {
        if (!apkFile.exists() || apkFile.length() == 0L) {
            return SecurityVerificationResult.Failure("APK file does not exist or is empty.")
        }

        val fileSha256 = computeSha256(apkFile)
        if (expectedSha256.isNotBlank() && !fileSha256.equals(expectedSha256.trim(), ignoreCase = true)) {
            apkFile.delete()
            return SecurityVerificationResult.Failure("Checksum mismatch: Expected $expectedSha256, got $fileSha256")
        }

        val pm = context.packageManager
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            PackageManager.GET_SIGNING_CERTIFICATES
        } else {
            @Suppress("DEPRECATION")
            PackageManager.GET_SIGNATURES
        }

        val archiveInfo: PackageInfo? = try {
            pm.getPackageArchiveInfo(apkFile.absolutePath, flags)
        } catch (e: Exception) {
            null
        }

        if (archiveInfo == null) {
            apkFile.delete()
            return SecurityVerificationResult.Failure("Corrupted APK: Android PackageParser failed to parse package.")
        }

        // 1. Package Name Verification
        if (archiveInfo.packageName != EXPECTED_PACKAGE_NAME) {
            apkFile.delete()
            return SecurityVerificationResult.Failure(
                "Package mismatch: Expected $EXPECTED_PACKAGE_NAME but found ${archiveInfo.packageName}."
            )
        }

        // 2. Anti-downgrade protection
        val apkVersionCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            archiveInfo.longVersionCode.toInt()
        } else {
            @Suppress("DEPRECATION")
            archiveInfo.versionCode
        }

        if (apkVersionCode <= installedVersionCode) {
            apkFile.delete()
            return SecurityVerificationResult.Failure(
                "Anti-downgrade protection: Cannot install version $apkVersionCode over existing version $installedVersionCode."
            )
        }

        // 3. Signing Certificate Verification
        val certSignatures = getSignatures(archiveInfo)
        if (certSignatures.isEmpty()) {
            apkFile.delete()
            return SecurityVerificationResult.Failure("Unsigned APK: No valid signing certificates detected.")
        }

        var hasMatchingCert = false
        for (sig in certSignatures) {
            val certSha256 = computeCertSha256(sig)
            if (certSha256.equals(PRODUCTION_CERT_SHA256, ignoreCase = true)) {
                hasMatchingCert = true
                break
            }
        }

        // Also check if matches currently running app's installed certificate
        if (!hasMatchingCert) {
            val installedCertSignatures = getInstalledSignatures(context)
            for (installedSig in installedCertSignatures) {
                val installedCertSha256 = computeCertSha256(installedSig)
                for (apkSig in certSignatures) {
                    if (computeCertSha256(apkSig).equals(installedCertSha256, ignoreCase = true)) {
                        hasMatchingCert = true
                        break
                    }
                }
                if (hasMatchingCert) break
            }
        }

        if (!hasMatchingCert) {
            apkFile.delete()
            return SecurityVerificationResult.Failure(
                "Signature verification failed: APK is not signed with the trusted DECKKNOB production key."
            )
        }

        return SecurityVerificationResult.Success(
            sha256 = fileSha256,
            packageName = archiveInfo.packageName,
            versionCode = apkVersionCode,
            versionName = archiveInfo.versionName ?: ""
        )
    }

    private fun getSignatures(packageInfo: PackageInfo): List<ByteArray> {
        val result = mutableListOf<ByteArray>()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            val signingInfo = packageInfo.signingInfo ?: return emptyList()
            if (signingInfo.hasMultipleSigners()) {
                signingInfo.apkContentsSigners?.forEach { result.add(it.toByteArray()) }
            } else {
                signingInfo.signingCertificateHistory?.forEach { result.add(it.toByteArray()) }
            }
        } else {
            @Suppress("DEPRECATION")
            packageInfo.signatures?.forEach { result.add(it.toByteArray()) }
        }
        return result
    }

    private fun getInstalledSignatures(context: Context): List<ByteArray> {
        return try {
            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                PackageManager.GET_SIGNING_CERTIFICATES
            } else {
                @Suppress("DEPRECATION")
                PackageManager.GET_SIGNATURES
            }
            val info = context.packageManager.getPackageInfo(context.packageName, flags)
            getSignatures(info)
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun computeCertSha256(certBytes: ByteArray): String {
        val md = MessageDigest.getInstance("SHA-256")
        return md.digest(certBytes).joinToString("") { "%02x".format(it) }
    }
}
