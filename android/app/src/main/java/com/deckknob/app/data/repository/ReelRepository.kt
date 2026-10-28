package com.deckknob.app.data.repository

import android.content.Context
import android.graphics.Bitmap
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.util.Log
import dagger.hilt.android.qualifiers.ApplicationContext
import java.io.File
import java.io.FileOutputStream
import com.deckknob.app.data.model.ReelCommentDto
import com.deckknob.app.data.model.ReelDto
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.SetOptions
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ReelRepository @Inject constructor(
    private val firestore: FirebaseFirestore,
    private val auth: FirebaseAuth,
    private val storageRepository: StorageRepository,
    @ApplicationContext private val context: Context
) {
    suspend fun getUserReels(uid: String): Result<List<ReelDto>> {
        return try {
            val snapshot = firestore.collection("reels")
                .whereEqualTo("authorId", uid)
                .get()
                .await()
            val reels = snapshot.toObjects(ReelDto::class.java)
            Result.success(reels)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getReels(limit: Long = 20): Result<List<ReelDto>> {
        return try {
            val snapshot = firestore.collection("reels")
                .orderBy("createdAt", Query.Direction.DESCENDING)
                .limit(limit)
                .get()
                .await()
            val reels = snapshot.toObjects(ReelDto::class.java)

            // Inject active user's like and bookmark state
            val currentUid = auth.currentUser?.uid
            if (currentUid != null) {
                for (reel in reels) {
                    if (reel.id.isNotEmpty()) {
                        try {
                            val likeSnap = firestore.collection("likes")
                                .document("${reel.id}_${currentUid}")
                                .get()
                                .await()
                            reel.isLiked = likeSnap.exists()

                            val saveSnap = firestore.collection("savedPosts")
                                .document("${reel.id}_${currentUid}")
                                .get()
                                .await()
                            reel.isBookmarked = saveSnap.exists()
                        } catch (_: Exception) {
                            // Non-fatal fallback for network delays
                        }
                    }
                }
            }
            Result.success(reels)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun likeReel(reelId: String): Result<Unit> {
        return try {
            val currentUid = auth.currentUser?.uid ?: throw Exception("User not authenticated")
            if (reelId.isEmpty()) throw Exception("Invalid reel ID")

            val likeRef = firestore.collection("likes").document("${reelId}_${currentUid}")
            val likeData = hashMapOf(
                "targetId" to reelId,
                "targetType" to "reel",
                "userId" to currentUid,
                "createdAt" to FieldValue.serverTimestamp()
            )
            likeRef.set(likeData, SetOptions.merge()).await()

            firestore.collection("reels").document(reelId)
                .update("likes_count", FieldValue.increment(1))
                .await()

            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun unlikeReel(reelId: String): Result<Unit> {
        return try {
            val currentUid = auth.currentUser?.uid ?: throw Exception("User not authenticated")
            if (reelId.isEmpty()) throw Exception("Invalid reel ID")

            firestore.collection("likes").document("${reelId}_${currentUid}")
                .delete()
                .await()

            firestore.collection("reels").document(reelId)
                .update("likes_count", FieldValue.increment(-1))
                .await()

            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun bookmarkReel(reelId: String, isBookmarked: Boolean): Result<Unit> {
        return try {
            val currentUid = auth.currentUser?.uid ?: throw Exception("User not authenticated")
            if (reelId.isEmpty()) throw Exception("Invalid reel ID")

            val saveRef = firestore.collection("savedPosts").document("${reelId}_${currentUid}")
            if (isBookmarked) {
                val saveData = hashMapOf(
                    "userId" to currentUid,
                    "postId" to reelId,
                    "createdAt" to FieldValue.serverTimestamp()
                )
                saveRef.set(saveData, SetOptions.merge()).await()
            } else {
                saveRef.delete().await()
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getComments(reelId: String): Result<List<ReelCommentDto>> {
        return try {
            if (reelId.isEmpty()) return Result.success(emptyList())
            val snapshot = firestore.collection("reels")
                .document(reelId)
                .collection("comments")
                .orderBy("createdAt", Query.Direction.ASCENDING)
                .get()
                .await()
            val comments = snapshot.documents.mapNotNull { doc ->
                doc.toObject(ReelCommentDto::class.java)?.copy(id = doc.id)
            }
            Result.success(comments)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun addComment(reelId: String, text: String): Result<ReelCommentDto> {
        return try {
            val user = auth.currentUser ?: throw Exception("User not authenticated")
            val uid = user.uid
            if (reelId.isEmpty() || text.trim().isEmpty()) throw Exception("Empty comment text")

            val userDoc = firestore.collection("users").document(uid).get().await()
            val username = userDoc.getString("username") ?: user.displayName ?: "selector"
            val avatar = userDoc.getString("profile_pic") ?: ""

            val commentDocRef = firestore.collection("reels")
                .document(reelId)
                .collection("comments")
                .document()

            val commentData = hashMapOf(
                "authorId" to uid,
                "authorUsername" to username,
                "authorAvatar" to avatar,
                "text" to text.trim(),
                "createdAt" to FieldValue.serverTimestamp()
            )

            commentDocRef.set(commentData).await()

            firestore.collection("reels").document(reelId)
                .update("comments_count", FieldValue.increment(1))
                .await()

            val comment = ReelCommentDto(
                id = commentDocRef.id,
                authorId = uid,
                authorUsername = username,
                authorAvatar = avatar,
                text = text.trim()
            )
            Result.success(comment)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createReel(
        caption: String,
        videoUri: Uri,
        durationSeconds: Int = 0,
        music: com.deckknob.app.data.model.MusicDto? = null
    ): Result<ReelDto> {
        return try {
            val user = auth.currentUser ?: throw Exception("User not authenticated")
            val uid = user.uid

            val userDoc = firestore.collection("users").document(uid).get().await()
            val username = userDoc.getString("username") ?: user.displayName ?: "User"
            val avatar = userDoc.getString("profile_pic") ?: ""
            val role = userDoc.getString("role") ?: "dj"

            val videoUrl = storageRepository.uploadFile(videoUri, "reels/$uid", "reel").getOrThrow()

            var posterUrl = ""
            try {
                val retriever = MediaMetadataRetriever()
                retriever.setDataSource(context, videoUri)
                val bitmap = retriever.getFrameAtTime(1000000, MediaMetadataRetriever.OPTION_CLOSEST_SYNC)
                    ?: retriever.frameAtTime
                if (bitmap != null) {
                    val tempThumbFile = File(context.cacheDir, "thumb_${System.currentTimeMillis()}.jpg")
                    FileOutputStream(tempThumbFile).use { out ->
                        bitmap.compress(Bitmap.CompressFormat.JPEG, 85, out)
                    }
                    val thumbUri = Uri.fromFile(tempThumbFile)
                    posterUrl = storageRepository.uploadFile(thumbUri, "reels_posters/$uid", "poster").getOrDefault("")
                    tempThumbFile.delete()
                }
                retriever.release()
            } catch (e: Exception) {
                Log.w("ReelRepo", "Thumbnail extraction fallback to videoUrl", e)
            }
            if (posterUrl.isEmpty()) {
                posterUrl = videoUrl
            }

            val docRef = firestore.collection("reels").document()
            val reel = ReelDto(
                id = docRef.id,
                authorId = uid,
                authorUsername = username,
                authorAvatar = avatar,
                authorRole = role,
                media_url = videoUrl,
                mediaUrl = videoUrl,
                media_type = "video",
                mediaType = "video",
                poster = posterUrl,
                caption = caption,
                durationSeconds = durationSeconds,
                music = music
            )

            docRef.set(reel).await()

            try {
                firestore.collection("users").document(uid)
                    .update("reelsCount", FieldValue.increment(1))
                    .await()
            } catch (_: Exception) {}

            Result.success(reel)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
