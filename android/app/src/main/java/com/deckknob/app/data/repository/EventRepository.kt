package com.deckknob.app.data.repository

import android.net.Uri
import com.deckknob.app.data.model.EventDto
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class EventRepository @Inject constructor(
    private val firestore: FirebaseFirestore,
    private val auth: FirebaseAuth,
    private val storageRepository: StorageRepository
) {
    /**
     * Real-time reactive flow of active events listening to Cloud Firestore snapshots.
     * Automatically filters out trashed or deleted events.
     */
    fun getEventsFlow(): Flow<List<EventDto>> = callbackFlow {
        val listenerRegistration = firestore.collection("events")
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .limit(50)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }
                if (snapshot != null) {
                    val events = snapshot.toObjects(EventDto::class.java)
                        .filter { it.status != "trashed" }
                    trySend(events)
                }
            }
        awaitClose {
            listenerRegistration.remove()
        }
    }

    suspend fun getEvents(limit: Long = 20): Result<List<EventDto>> {
        return try {
            val snapshot = firestore.collection("events")
                .orderBy("createdAt", Query.Direction.DESCENDING)
                .limit(limit)
                .get()
                .await()
            val events = snapshot.toObjects(EventDto::class.java)
                .filter { it.status != "trashed" }
            Result.success(events)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createEvent(
        title: String,
        venue: String,
        city: String,
        date: String,
        time: String,
        description: String,
        bannerUri: Uri?,
        url: String
    ): Result<EventDto> {
        return try {
            val user = auth.currentUser ?: throw Exception("User not authenticated")
            val uid = user.uid

            val userDoc = firestore.collection("users").document(uid).get().await()
            val username = userDoc.getString("username") ?: user.displayName ?: "User"

            var imageUrl = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=900&q=80"
            if (bannerUri != null) {
                imageUrl = storageRepository.uploadFile(bannerUri, "events/$uid", "event").getOrThrow()
            }

            val docRef = firestore.collection("events").document()
            val event = EventDto(
                id = docRef.id,
                authorId = uid,
                username = username,
                title = title,
                venue = venue,
                city = city,
                date = date,
                time = time,
                dateTimeIso = System.currentTimeMillis().toString(),
                image = imageUrl,
                media_url = imageUrl,
                description = description,
                url = url,
                ticketUrl = url,
                status = "scheduled",
                lineup = listOf(username),
                performingDJs = listOf(username)
            )

            docRef.set(event).await()
            Result.success(event)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Owner-only update of an existing event.
     */
    suspend fun updateEvent(
        eventId: String,
        title: String,
        venue: String,
        city: String,
        date: String,
        time: String,
        description: String,
        bannerUri: Uri?,
        url: String
    ): Result<EventDto> {
        return try {
            val user = auth.currentUser ?: throw Exception("User not authenticated")
            val uid = user.uid

            val docRef = firestore.collection("events").document(eventId)
            val docSnap = docRef.get().await()
            if (!docSnap.exists()) throw Exception("Event not found")

            val currentAuthorId = docSnap.getString("authorId") ?: ""
            if (currentAuthorId != uid) {
                throw Exception("Unauthorized: You can only edit your own events.")
            }

            val updates = mutableMapOf<String, Any>(
                "title" to title,
                "venue" to venue,
                "city" to city,
                "date" to date,
                "time" to time,
                "description" to description,
                "url" to url,
                "ticketUrl" to url
            )

            if (bannerUri != null) {
                val imageUrl = storageRepository.uploadFile(bannerUri, "events/$uid", "event").getOrThrow()
                updates["image"] = imageUrl
                updates["media_url"] = imageUrl
            }

            docRef.update(updates).await()
            val updatedSnap = docRef.get().await()
            val updatedEvent = updatedSnap.toObject(EventDto::class.java) ?: throw Exception("Failed to load updated event")
            Result.success(updatedEvent)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Owner-only deletion of an event.
     * Marks event as 'trashed' and deletes document from Firestore.
     */
    suspend fun deleteEvent(eventId: String, authorId: String): Result<Unit> {
        return try {
            val user = auth.currentUser ?: throw Exception("User not authenticated")
            val uid = user.uid
            if (authorId != uid) {
                throw Exception("Unauthorized: You can only delete your own events.")
            }

            val docRef = firestore.collection("events").document(eventId)
            // Soft delete first for real-time safety, then deleteDoc
            try {
                docRef.update("status", "trashed").await()
            } catch (_: Exception) {}

            try {
                docRef.delete().await()
            } catch (_: Exception) {}

            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Fetch a single event by ID.
     * Rejects missing or trashed events with a failure.
     */
    suspend fun getEvent(eventId: String): Result<EventDto> {
        return try {
            if (eventId.isBlank()) {
                return Result.failure(IllegalArgumentException("Event ID cannot be blank"))
            }
            val docSnap = firestore.collection("events").document(eventId).get().await()
            if (!docSnap.exists()) {
                return Result.failure(NoSuchElementException("Event not found"))
            }
            val event = docSnap.toObject(EventDto::class.java)
                ?: return Result.failure(IllegalStateException("Failed to parse event data"))
            if (event.status == "trashed") {
                return Result.failure(NoSuchElementException("Event has been deleted"))
            }
            Result.success(event.copy(id = docSnap.id))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Toggles RSVP status for the authenticated user on this event.
     * Atomically adds or removes the user's UID in the attendees array.
     */
    suspend fun toggleRsvp(eventId: String): Result<Boolean> {
        return try {
            val user = auth.currentUser ?: throw Exception("User not authenticated")
            val uid = user.uid
            if (eventId.isBlank()) {
                return Result.failure(IllegalArgumentException("Event ID cannot be blank"))
            }
            val docRef = firestore.collection("events").document(eventId)
            val docSnap = docRef.get().await()
            if (!docSnap.exists()) {
                return Result.failure(NoSuchElementException("Event not found"))
            }
            val event = docSnap.toObject(EventDto::class.java)
                ?: return Result.failure(IllegalStateException("Failed to parse event data"))
            val isAttending = event.attendees.contains(uid)
            val update = if (isAttending) {
                FieldValue.arrayRemove(uid)
            } else {
                FieldValue.arrayUnion(uid)
            }
            docRef.update(
                mapOf(
                    "attendees" to update,
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
            Result.success(!isAttending)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
