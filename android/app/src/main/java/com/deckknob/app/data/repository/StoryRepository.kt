package com.deckknob.app.data.repository

import android.net.Uri
import com.deckknob.app.data.model.MusicDto
import com.deckknob.app.data.model.StoryDto
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import kotlinx.coroutines.tasks.await
import java.util.Date
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class StoryRepository @Inject constructor(
    private val firestore: FirebaseFirestore,
    private val auth: FirebaseAuth,
    private val storageRepository: StorageRepository
) {
    suspend fun getActiveStories(): Result<List<StoryDto>> {
        return try {
            val now = Date()
            val cutoffMillis = System.currentTimeMillis() - 24 * 60 * 60 * 1000
            val stories = try {
                val snapshot = firestore.collection("stories")
                    .whereGreaterThan("expiresAt", now)
                    .orderBy("expiresAt", Query.Direction.DESCENDING)
                    .get()
                    .await()
                snapshot.toObjects(StoryDto::class.java)
            } catch (indexOrFilterException: Exception) {
                // Resilient fallback: fetch recent stories and apply strict 24-hour expiration filter in-memory
                val snapshot = firestore.collection("stories")
                    .limit(50)
                    .get()
                    .await()
                snapshot.toObjects(StoryDto::class.java).filter { story ->
                    val expiry = story.expiresAt?.time ?: (story.createdAt?.time?.plus(24 * 60 * 60 * 1000) ?: Long.MAX_VALUE)
                    expiry > System.currentTimeMillis() && (story.createdAt == null || story.createdAt.time >= cutoffMillis)
                }
            }
            Result.success(stories)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createStory(
        mediaUri: Uri,
        mediaType: String = "image",
        caption: String = "",
        music: MusicDto? = null,
        filterName: String = "normal",
        textOverlay: String = ""
    ): Result<StoryDto> {
        return try {
            val user = auth.currentUser ?: throw Exception("User not authenticated")
            val uid = user.uid

            val userDoc = firestore.collection("users").document(uid).get().await()
            val username = userDoc.getString("username") ?: user.displayName ?: "User"
            val avatar = userDoc.getString("profile_pic") ?: ""

            val downloadUrl = storageRepository.uploadFile(mediaUri, "stories/$uid", "story").getOrThrow()
            val now = Date()
            val expiresAt = Date(System.currentTimeMillis() + 24 * 60 * 60 * 1000)

            val docRef = firestore.collection("stories").document()
            val story = StoryDto(
                id = docRef.id,
                authorId = uid,
                authorUsername = username,
                authorAvatar = avatar,
                media_url = downloadUrl,
                mediaUrl = downloadUrl,
                media_type = mediaType,
                mediaType = mediaType,
                caption = caption,
                music = music,
                filterName = filterName,
                textOverlay = textOverlay,
                createdAt = now,
                expiresAt = expiresAt
            )

            docRef.set(story).await()
            Result.success(story)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
