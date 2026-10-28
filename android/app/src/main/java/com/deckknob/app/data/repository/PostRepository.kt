package com.deckknob.app.data.repository

import android.net.Uri
import com.deckknob.app.data.model.PostDto
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.SetOptions
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PostRepository @Inject constructor(
    private val firestore: FirebaseFirestore,
    private val auth: FirebaseAuth,
    private val storageRepository: StorageRepository
) {
    suspend fun getFeedPosts(limit: Long = 20): Result<List<PostDto>> {
        return try {
            val snapshot = firestore.collection("posts")
                .orderBy("createdAt", Query.Direction.DESCENDING)
                .limit(limit)
                .get()
                .await()
            val posts = snapshot.toObjects(PostDto::class.java)

            // Inject active user's like state
            val currentUid = auth.currentUser?.uid
            if (currentUid != null) {
                for (post in posts) {
                    if (post.id.isNotEmpty()) {
                        try {
                            val likeSnap = firestore.collection("likes")
                                .document("${post.id}_${currentUid}")
                                .get()
                                .await()
                            post.isLiked = likeSnap.exists()
                        } catch (_: Exception) {
                            // Non-fatal fallback for network delays
                        }
                    }
                }
            }
            Result.success(posts)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun likePost(postId: String): Result<Unit> {
        return try {
            val currentUid = auth.currentUser?.uid ?: throw Exception("User not authenticated")
            if (postId.isEmpty()) throw Exception("Invalid post ID")

            val likeRef = firestore.collection("likes").document("${postId}_${currentUid}")
            val likeData = hashMapOf(
                "targetId" to postId,
                "targetType" to "post",
                "userId" to currentUid,
                "createdAt" to FieldValue.serverTimestamp()
            )
            likeRef.set(likeData, SetOptions.merge()).await()

            firestore.collection("posts").document(postId)
                .update("likes_count", FieldValue.increment(1))
                .await()

            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun unlikePost(postId: String): Result<Unit> {
        return try {
            val currentUid = auth.currentUser?.uid ?: throw Exception("User not authenticated")
            if (postId.isEmpty()) throw Exception("Invalid post ID")

            firestore.collection("likes").document("${postId}_${currentUid}")
                .delete()
                .await()

            firestore.collection("posts").document(postId)
                .update("likes_count", FieldValue.increment(-1))
                .await()

            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getUserPosts(uid: String): Result<List<PostDto>> {
        return try {
            val snapshot = firestore.collection("posts")
                .whereEqualTo("authorId", uid)
                .get()
                .await()
            val posts = snapshot.toObjects(PostDto::class.java)
            Result.success(posts)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createPost(
        caption: String,
        mediaUri: Uri?,
        mediaType: String = "image",
        music: com.deckknob.app.data.model.MusicDto? = null
    ): Result<PostDto> {
        return try {
            val user = auth.currentUser ?: throw Exception("User not authenticated")
            val uid = user.uid

            val userDoc = firestore.collection("users").document(uid).get().await()
            val username = userDoc.getString("username") ?: user.displayName ?: "User"
            val avatar = userDoc.getString("profile_pic") ?: ""
            val role = userDoc.getString("role") ?: "dj"

            var downloadUrl = ""
            if (mediaUri != null) {
                val uploadResult = storageRepository.uploadFile(mediaUri, "posts/$uid", "post")
                downloadUrl = uploadResult.getOrThrow()
            }

            val docRef = firestore.collection("posts").document()
            val post = PostDto(
                id = docRef.id,
                authorId = uid,
                authorUsername = username,
                authorAvatar = avatar,
                authorRole = role,
                media_url = downloadUrl,
                mediaUrl = downloadUrl,
                media_type = mediaType,
                mediaType = mediaType,
                caption = caption,
                music = music
            )

            docRef.set(post).await()
            Result.success(post)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
