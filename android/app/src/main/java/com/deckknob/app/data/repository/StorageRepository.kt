package com.deckknob.app.data.repository

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import com.deckknob.app.util.DeckKnobLogger
import com.google.firebase.storage.FirebaseStorage
import com.google.firebase.storage.StorageMetadata
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException
import java.io.InputStream
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

data class MediaFileInfo(
    val displayName: String,
    val sizeBytes: Long,
    val mimeType: String,
    val extension: String
)

@Singleton
class StorageRepository @Inject constructor(
    private val storage: FirebaseStorage,
    @ApplicationContext private val context: Context
) {
    companion object {
        const val MAX_AUDIO_SIZE_BYTES = 25L * 1024L * 1024L // 25 MB
        const val MAX_IMAGE_SIZE_BYTES = 15L * 1024L * 1024L // 15 MB
        const val MAX_VIDEO_SIZE_BYTES = 100L * 1024L * 1024L // 100 MB

        private const val CLOUDINARY_CLOUD_NAME = "mmdsfe3u"
        private const val CLOUDINARY_UPLOAD_PRESET = "deckknob_uploads"
    }

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .build()

    /**
     * Resolves human-readable name, accurate MIME type, file size, and extension for a given Uri.
     */
    fun getMediaFileInfo(uri: Uri, isAudioHint: Boolean = false): MediaFileInfo {
        val contentResolver = context.contentResolver
        var displayName = ""
        var sizeBytes = 0L

        // 1. Query ContentResolver for OpenableColumns
        if (uri.scheme == "content") {
            try {
                contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                    val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                    val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
                    if (cursor.moveToFirst()) {
                        if (nameIndex != -1) displayName = cursor.getString(nameIndex) ?: ""
                        if (sizeIndex != -1) sizeBytes = cursor.getLong(sizeIndex)
                    }
                }
            } catch (e: Exception) {
                DeckKnobLogger.w(DeckKnobLogger.Tag.MEDIA, "Could not query OpenableColumns: ${e.message}")
            }
        }

        if (displayName.isBlank()) {
            displayName = uri.lastPathSegment ?: "media_${System.currentTimeMillis()}"
        }

        // If size is still 0, attempt to probe via inputStream
        if (sizeBytes <= 0L) {
            try {
                contentResolver.openInputStream(uri)?.use { stream ->
                    sizeBytes = stream.available().toLong()
                }
            } catch (_: Exception) {}
        }

        // 2. Determine MIME type
        var resolvedMime: String? = contentResolver.getType(uri)
        if (resolvedMime == "application/octet-stream" || resolvedMime.isNullOrBlank()) {
            resolvedMime = null
        }

        // 3. Fallback to extension check from displayName or URI
        val lowerName = displayName.lowercase()
        val extFromName = lowerName.substringAfterLast('.', "")
        if (resolvedMime == null && extFromName.isNotBlank()) {
            resolvedMime = when (extFromName) {
                "mp3" -> "audio/mpeg"
                "wav" -> "audio/wav"
                "m4a" -> "audio/mp4"
                "aac" -> "audio/aac"
                "ogg" -> "audio/ogg"
                "flac" -> "audio/flac"
                "png" -> "image/png"
                "jpg", "jpeg" -> "image/jpeg"
                "gif" -> "image/gif"
                "webp" -> "image/webp"
                "mp4" -> "video/mp4"
                "mov" -> "video/quicktime"
                else -> null
            }
        }

        // 4. Magic byte inspection if still undetermined
        if (resolvedMime == null) {
            resolvedMime = probeMagicBytes(uri)
        }

        // 5. Contextual fallback if still undetermined
        val finalMime = resolvedMime ?: when {
            isAudioHint || lowerName.endsWith(".mp3") -> "audio/mpeg"
            lowerName.endsWith(".wav") -> "audio/wav"
            lowerName.endsWith(".png") -> "image/png"
            lowerName.endsWith(".mp4") -> "video/mp4"
            else -> if (isAudioHint) "audio/mpeg" else "image/jpeg"
        }

        // 6. Determine canonical extension
        val finalExt = when {
            finalMime.contains("mpeg") || finalMime.contains("mp3") -> "mp3"
            finalMime.contains("wav") -> "wav"
            finalMime.contains("aac") -> "aac"
            finalMime.contains("ogg") -> "ogg"
            finalMime.contains("flac") -> "flac"
            finalMime.contains("audio/mp4") || finalMime.contains("m4a") -> "m4a"
            finalMime.contains("video") || finalMime.contains("mp4") -> "mp4"
            finalMime.contains("png") -> "png"
            finalMime.contains("gif") -> "gif"
            finalMime.contains("webp") -> "webp"
            extFromName.isNotBlank() && extFromName.length in 2..4 -> extFromName
            else -> if (isAudioHint) "mp3" else "jpg"
        }

        return MediaFileInfo(
            displayName = displayName,
            sizeBytes = sizeBytes,
            mimeType = finalMime,
            extension = finalExt
        )
    }

    private fun probeMagicBytes(uri: Uri): String? {
        return try {
            context.contentResolver.openInputStream(uri)?.use { stream ->
                val header = ByteArray(12)
                val read = stream.read(header)
                if (read >= 4) {
                    when {
                        // ID3 for MP3: 'I', 'D', '3'
                        header[0] == 0x49.toByte() && header[1] == 0x44.toByte() && header[2] == 0x33.toByte() -> "audio/mpeg"
                        // MP3 Sync Word: 0xFF 0xFB or 0xFF 0xF3 or 0xFF 0xF2
                        header[0] == 0xFF.toByte() && ((header[1].toInt() and 0xE0) == 0xE0) -> "audio/mpeg"
                        // RIFF....WAVE for WAV
                        header[0] == 'R'.code.toByte() && header[1] == 'I'.code.toByte() &&
                                header[2] == 'F'.code.toByte() && header[3] == 'F'.code.toByte() -> "audio/wav"
                        // OggS
                        header[0] == 'O'.code.toByte() && header[1] == 'g'.code.toByte() &&
                                header[2] == 'g'.code.toByte() && header[3] == 'S'.code.toByte() -> "audio/ogg"
                        // fLaC
                        header[0] == 'f'.code.toByte() && header[1] == 'L'.code.toByte() &&
                                header[2] == 'a'.code.toByte() && header[3] == 'C'.code.toByte() -> "audio/flac"
                        // PNG
                        header[0] == 0x89.toByte() && header[1] == 0x50.toByte() &&
                                header[2] == 0x4E.toByte() && header[3] == 0x47.toByte() -> "image/png"
                        // JPEG: 0xFF 0xD8 0xFF
                        header[0] == 0xFF.toByte() && header[1] == 0xD8.toByte() && header[2] == 0xFF.toByte() -> "image/jpeg"
                        // MP4/M4A: ....ftyp
                        read >= 8 && header[4] == 'f'.code.toByte() && header[5] == 't'.code.toByte() &&
                                header[6] == 'y'.code.toByte() && header[7] == 'p'.code.toByte() -> "audio/mp4"
                        else -> null
                    }
                } else null
            }
        } catch (_: Exception) {
            null
        }
    }

    private suspend fun uploadToCloudinary(
        uri: Uri,
        pathFolder: String,
        fileInfo: MediaFileInfo
    ): String = withContext(Dispatchers.IO) {
        val endpoint = "https://api.cloudinary.com/v1_1/$CLOUDINARY_CLOUD_NAME/auto/upload"

        val inputStream = context.contentResolver.openInputStream(uri)
            ?: throw IllegalArgumentException("Cannot open stream for $uri")
        val bytes = inputStream.use { it.readBytes() }

        val mediaType = fileInfo.mimeType.toMediaTypeOrNull() ?: "application/octet-stream".toMediaTypeOrNull()
        val requestBody = MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart("upload_preset", CLOUDINARY_UPLOAD_PRESET)
            .addFormDataPart("folder", "deckknob/$pathFolder")
            .addFormDataPart(
                "file",
                fileInfo.displayName.ifBlank { "upload.${fileInfo.extension}" },
                bytes.toRequestBody(mediaType)
            )
            .build()

        val request = Request.Builder()
            .url(endpoint)
            .post(requestBody)
            .build()

        val response = httpClient.newCall(request).execute()
        val responseBody = response.body?.string() ?: ""
        if (!response.isSuccessful) {
            throw IOException("Cloudinary upload failed (HTTP ${response.code}): $responseBody")
        }

        val json = JSONObject(responseBody)
        if (json.has("secure_url")) {
            json.getString("secure_url")
        } else {
            throw IOException("Cloudinary response missing secure_url: $responseBody")
        }
    }

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

            val isAudioHint = pathFolder.contains("demos") || filePrefix.contains("demo") || filePrefix.contains("audio")
            val fileInfo = getMediaFileInfo(uri, isAudioHint)

            // Validate file size for audio demos
            if (isAudioHint && fileInfo.sizeBytes > MAX_AUDIO_SIZE_BYTES) {
                val sizeMb = String.format(java.util.Locale.US, "%.1f", fileInfo.sizeBytes.toDouble() / (1024 * 1024))
                throw IllegalArgumentException("Audio file size (${sizeMb}MB) exceeds 25MB limit.")
            }

            val filename = "${filePrefix}_${System.currentTimeMillis()}.${fileInfo.extension}"
            val fullPath = "$pathFolder/$filename"
            val storageRef = storage.reference.child(fullPath)

            val metadata = StorageMetadata.Builder()
                .setContentType(fileInfo.mimeType)
                .setCustomMetadata("originalName", fileInfo.displayName)
                .setCustomMetadata("uploadedAt", System.currentTimeMillis().toString())
                .build()

            // Try Firebase Storage first, fallback to Cloudinary when unprovisioned / 404
            try {
                try {
                    storageRef.putFile(uri, metadata).await()
                } catch (_: Exception) {
                    val inputStream = context.contentResolver.openInputStream(uri)
                        ?: throw IllegalArgumentException("Cannot open content stream for $uri")
                    inputStream.use { stream ->
                        storageRef.putStream(stream, metadata).await()
                    }
                }
                val downloadUrl = storageRef.downloadUrl.await().toString()
                DeckKnobLogger.d(DeckKnobLogger.Tag.MEDIA, "Storage upload completed via Firebase: $fullPath (mime=${fileInfo.mimeType})")
                Result.success(downloadUrl)
            } catch (firebaseErr: Exception) {
                DeckKnobLogger.w(DeckKnobLogger.Tag.MEDIA, "Firebase Storage upload failed (${firebaseErr.message}), falling back to media storage...")
                try {
                    val cloudinaryUrl = uploadToCloudinary(uri, pathFolder, fileInfo)
                    DeckKnobLogger.i(DeckKnobLogger.Tag.MEDIA, "Storage upload completed via Cloudinary fallback: $cloudinaryUrl (mime=${fileInfo.mimeType})")
                    Result.success(cloudinaryUrl)
                } catch (fallbackErr: Exception) {
                    DeckKnobLogger.e(DeckKnobLogger.Tag.MEDIA, "All storage upload attempts failed", fallbackErr)
                    Result.failure(firebaseErr)
                }
            }
        } catch (e: Exception) {
            DeckKnobLogger.w(DeckKnobLogger.Tag.MEDIA, "Storage upload failed for $pathFolder/$filePrefix: ${e.message}", e)
            Result.failure(e)
        }
    }
}

