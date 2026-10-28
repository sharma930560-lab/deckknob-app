package com.deckknob.app.data.repository

import com.deckknob.app.data.model.ChatDto
import com.deckknob.app.data.model.ChatMessageDto
import com.deckknob.app.data.model.UserDto
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.SetOptions
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ChatRepository @Inject constructor(
    private val firestore: FirebaseFirestore,
    private val auth: FirebaseAuth,
    private val authRepository: AuthRepository
) {
    val currentUserId: String?
        get() = auth.currentUser?.uid

    fun getChatId(uid1: String, uid2: String): String {
        require(uid1.isNotBlank() && uid2.isNotBlank()) { "User IDs must not be blank" }
        require(uid1 != uid2) { "Cannot chat with yourself" }
        return if (uid1 < uid2) "${uid1}_${uid2}" else "${uid2}_${uid1}"
    }

    suspend fun getOrCreateChat(targetUid: String): Result<String> {
        val myUid = currentUserId ?: return Result.failure(IllegalStateException("User not authenticated"))
        if (targetUid.isBlank()) return Result.failure(IllegalArgumentException("Target user ID cannot be blank"))
        if (targetUid == myUid) return Result.failure(IllegalArgumentException("Cannot chat with yourself"))

        return try {
            val chatId = getChatId(myUid, targetUid)
            val chatRef = firestore.collection("chats").document(chatId)

            // Directly initialize or merge chat document (matches web chatService.js)
            // Bypasses get() pre-read which would trigger 403 on non-existent documents
            val data = hashMapOf(
                "participants" to listOf(myUid, targetUid),
                "updatedAt" to FieldValue.serverTimestamp()
            )
            chatRef.set(data, SetOptions.merge()).await()
            Result.success(chatId)
        } catch (e: Exception) {
            android.util.Log.e("ChatRepository", "getOrCreateChat failed: ${e.message}", e)
            Result.failure(e)
        }
    }

    fun observeMessages(chatId: String): Flow<List<ChatMessageDto>> = callbackFlow {
        if (chatId.isBlank()) {
            trySend(emptyList())
            close()
            return@callbackFlow
        }

        val listener = firestore.collection("chats")
            .document(chatId)
            .collection("messages")
            .orderBy("createdAt", Query.Direction.ASCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    android.util.Log.w("ChatRepository", "observeMessages error for $chatId: ${error.message}")
                    return@addSnapshotListener
                }
                if (snapshot != null) {
                    val messages = snapshot.documents.mapNotNull { doc ->
                        ChatMessageDto(
                            id = doc.id,
                            senderId = doc.getString("senderId") ?: "",
                            text = doc.getString("text") ?: "",
                            createdAt = doc.getTimestamp("createdAt")
                        )
                    }
                    trySend(messages)
                }
            }
        awaitClose { listener.remove() }
    }

    suspend fun sendMessage(chatId: String, text: String): Result<String> {
        val myUid = currentUserId ?: return Result.failure(IllegalStateException("User not authenticated"))
        val trimmed = text.trim()
        if (trimmed.isEmpty()) return Result.failure(IllegalArgumentException("Message cannot be empty"))
        if (chatId.isBlank()) return Result.failure(IllegalArgumentException("Chat ID cannot be blank"))

        return try {
            val messageData = hashMapOf(
                "senderId" to myUid,
                "text" to trimmed,
                "createdAt" to FieldValue.serverTimestamp()
            )
            val msgRef = firestore.collection("chats")
                .document(chatId)
                .collection("messages")
                .add(messageData)
                .await()

            val chatRef = firestore.collection("chats").document(chatId)
            chatRef.update(
                mapOf(
                    "lastMessage" to trimmed,
                    "lastMessageAt" to FieldValue.serverTimestamp(),
                    "lastSenderId" to myUid,
                    "readBy" to listOf(myUid)
                )
            ).await()

            Result.success(msgRef.id)
        } catch (e: Exception) {
            android.util.Log.e("ChatRepository", "sendMessage failed: ${e.message}", e)
            Result.failure(e)
        }
    }

    fun observeUserChats(): Flow<List<ChatDto>> = callbackFlow {
        val myUid = currentUserId
        if (myUid == null) {
            trySend(emptyList())
            close()
            return@callbackFlow
        }

        val listener = firestore.collection("chats")
            .whereArrayContains("participants", myUid)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    android.util.Log.w("ChatRepository", "observeUserChats error: ${error.message}")
                    return@addSnapshotListener
                }
                if (snapshot != null) {
                    val chats = snapshot.documents.mapNotNull { doc ->
                        @Suppress("UNCHECKED_CAST")
                        val participants = (doc.get("participants") as? List<String>) ?: emptyList()
                        ChatDto(
                            id = doc.id,
                            participants = participants,
                            lastMessage = doc.getString("lastMessage"),
                            lastMessageAt = doc.getTimestamp("lastMessageAt"),
                            lastSenderId = doc.getString("lastSenderId"),
                            readBy = (doc.get("readBy") as? List<String>) ?: emptyList()
                        )
                    }.sortedByDescending { it.lastMessageAt?.toDate()?.time ?: 0L }
                    trySend(chats)
                }
            }
        awaitClose { listener.remove() }
    }

    suspend fun getOtherUser(targetUid: String): UserDto? {
        return authRepository.fetchUserProfile(targetUid)
    }
}
