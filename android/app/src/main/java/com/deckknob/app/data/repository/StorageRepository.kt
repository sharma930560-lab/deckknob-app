package com.deckknob.app.data.repository

import android.content.Context
import android.net.Uri
import com.google.firebase.storage.FirebaseStorage
import com.google.firebase.storage.StorageMetadata
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class StorageRepository @Inject constructor(
    private val storage: FirebaseStorage,
    @ApplicationContext private val context: Context
) {
    suspend fun uploadFile(
        uri: Uri,
        pathFolder: String,
        filePrefix: String = "media"
    ): Result<String> {
        return try {
            val scheme = uri.scheme?.lowercase() ?: ""
            // Guard: If URI is already an absolute HTTP/HTTPS remote URL, reuse it directly
            if (scheme == "http" || scheme == "https") {
                return Result.success(uri.toString())
            }

            val contentResolver = context.contentResolver
            val mimeType = contentResolver.getType(uri) ?: when {
                uri.toString().endsWith(".png", ignoreCase = true) -> "image/png"
                uri.toString().endsWith(".gif", ignoreCase = true) -> "image/gif"
                uri.toString().endsWith(".mp4", ignoreCase = true) -> "video/mp4"
                uri.toString().endsWith(".mp3", ignoreCase = true) -> "audio/mpeg"
                uri.toString().endsWith(".wav", ignoreCase = true) -> "audio/wav"
                else -> "image/jpeg"
            }

            val extension = when {
                mimeType.contains("png") -> "png"
                mimeType.contains("gif") -> "gif"
                mimeType.contains("video") || mimeType.contains("mp4") -> "mp4"
                mimeType.contains("audio") || mimeType.contains("mpeg") || mimeType.contains("mp3") -> "mp3"
                mimeType.contains("wav") -> "wav"
                else -> "jpg"
            }

            val filename = "${filePrefix}_${System.currentTimeMillis()}.$extension"
            val fullPath = "$pathFolder/$filename"
            val storageRef = storage.reference.child(fullPath)

            val metadata = StorageMetadata.Builder()
                .setContentType(mimeType)
                .build()

            // Try direct putFile, fallback to openInputStream + putStream for scoped/sandboxed content URIs
            try {
                storageRef.putFile(uri, metadata).await()
            } catch (_: Exception) {
                val inputStream = contentResolver.openInputStream(uri)
                    ?: throw IllegalArgumentException("Cannot open content stream for $uri")
                inputStream.use { stream ->
                    storageRef.putStream(stream, metadata).await()
                }
            }

            val downloadUrl = storageRef.downloadUrl.await().toString()
            Result.success(downloadUrl)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
