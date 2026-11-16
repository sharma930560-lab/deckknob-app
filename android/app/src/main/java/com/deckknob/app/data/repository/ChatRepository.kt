package com.deckknob.app.data.repository

import com.deckknob.app.data.model.ChatDto
import com.deckknob.app.data.model.ChatMessageDto
import com.deckknob.app.data.model.UserDto
import com.deckknob.app.util.DeckKnobLogger
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.SetOptions
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import java.util.UUID
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

            // Canonicalize participants array deterministically (minUid, maxUid)
            // Ensures strict index-insensitive match and eliminates order mismatch 403s
            val sortedParticipants = if (myUid < targetUid) listOf(myUid, targetUid) else listOf(targetUid, myUid)

            val data = hashMapOf(
                "type" to "direct",
                "participants" to sortedParticipants,
                "updatedAt" to FieldValue.serverTimestamp()
            )
            chatRef.set(data, SetOptions.merge()).await()
            DeckKnobLogger.d(DeckKnobLogger.Tag.FIRESTORE, "getOrCreateChat ready: chatId=$chatId")
            Result.success(chatId)
        } catch (e: Exception) {
            DeckKnobLogger.e(DeckKnobLogger.Tag.FIRESTORE, "getOrCreateChat failed: ${e.message}", e)
            Result.failure(e)
        }
    }

    suspend fun createGroup(
        name: String,
        description: String? = null,
        imageUrl: String? = null,
        initialMembers: List<String>
    ): Result<String> {
        val myUid = currentUserId ?: return Result.failure(IllegalStateException("User not authenticated"))
        val trimmedName = name.trim()
        if (trimmedName.isEmpty()) return Result.failure(IllegalArgumentException("Group name cannot be empty"))
        if (trimmedName.length > 100) return Result.failure(IllegalArgumentException("Group name too long (max 100 chars)"))

        val participants = (initialMembers + myUid).filter { it.isNotBlank() }.distinct()
        if (participants.size < 2) {
            return Result.failure(IllegalArgumentException("Please select at least 1 other member to create a group"))
        }

        return try {
            val groupId = "group_${UUID.randomUUID()}"
            val groupRef = firestore.collection("chats").document(groupId)

            val data = hashMapOf(
                "type" to "group",
                "name" to trimmedName,
                "description" to (description?.trim()?.ifBlank { null }),
                "imageUrl" to (imageUrl?.trim()?.ifBlank { null }),
                "ownerId" to myUid,
                "adminIds" to listOf(myUid),
                "participants" to participants,
                "memberCount" to participants.size,
                "lastMessage" to "Group created",
                "lastMessageAt" to FieldValue.serverTimestamp(),
                "lastSenderId" to myUid,
                "readBy" to listOf(myUid),
                "createdAt" to FieldValue.serverTimestamp(),
                "updatedAt" to FieldValue.serverTimestamp()
            )

            groupRef.set(data).await()
            DeckKnobLogger.d(DeckKnobLogger.Tag.FIRESTORE, "createGroup created: groupId=$groupId, name=$trimmedName")
            Result.success(groupId)
        } catch (e: Exception) {
            DeckKnobLogger.e(DeckKnobLogger.Tag.FIRESTORE, "createGroup failed: ${e.message}", e)
            Result.failure(e)
        }
    }

    suspend fun getChatDetails(chatId: String): Result<ChatDto> {
        if (chatId.isBlank()) return Result.failure(IllegalArgumentException("Chat ID cannot be blank"))
        return try {
            val doc = firestore.collection("chats").document(chatId).get().await()
            if (!doc.exists()) return Result.failure(NoSuchElementException("Conversation not found"))

            @Suppress("UNCHECKED_CAST")
            val participants = (doc.get("participants") as? List<String>) ?: emptyList()
            @Suppress("UNCHECKED_CAST")
            val adminIds = (doc.get("adminIds") as? List<String>) ?: emptyList()
            @Suppress("UNCHECKED_CAST")
            val readBy = (doc.get("readBy") as? List<String>) ?: emptyList()

            val chat = ChatDto(
                id = doc.id,
                type = doc.getString("type") ?: "direct",
                name = doc.getString("name"),
                description = doc.getString("description"),
                imageUrl = doc.getString("imageUrl"),
                ownerId = doc.getString("ownerId"),
                adminIds = adminIds,
                memberCount = doc.getLong("memberCount")?.toInt() ?: participants.size,
                participants = participants,
                lastMessage = doc.getString("lastMessage"),
                lastMessageAt = doc.getTimestamp("lastMessageAt"),
                lastSenderId = doc.getString("lastSenderId"),
                readBy = readBy
            )
            Result.success(chat)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun observeChat(chatId: String): Flow<ChatDto?> = callbackFlow {
        if (chatId.isBlank()) {
            trySend(null)
            close()
            return@callbackFlow
        }

        val listener = firestore.collection("chats")
            .document(chatId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    DeckKnobLogger.w(DeckKnobLogger.Tag.FIRESTORE, "observeChat error for $chatId: ${error.message}")
                    return@addSnapshotListener
                }
                if (snapshot != null && snapshot.exists()) {
                    @Suppress("UNCHECKED_CAST")
                    val participants = (snapshot.get("participants") as? List<String>) ?: emptyList()
                    @Suppress("UNCHECKED_CAST")
                    val adminIds = (snapshot.get("adminIds") as? List<String>) ?: emptyList()
                    @Suppress("UNCHECKED_CAST")
                    val readBy = (snapshot.get("readBy") as? List<String>) ?: emptyList()

                    val chat = ChatDto(
                        id = snapshot.id,
                        type = snapshot.getString("type") ?: "direct",
                        name = snapshot.getString("name"),
                        description = snapshot.getString("description"),
                        imageUrl = snapshot.getString("imageUrl"),
                        ownerId = snapshot.getString("ownerId"),
                        adminIds = adminIds,
                        memberCount = snapshot.getLong("memberCount")?.toInt() ?: participants.size,
                        participants = participants,
                        lastMessage = snapshot.getString("lastMessage"),
                        lastMessageAt = snapshot.getTimestamp("lastMessageAt"),
                        lastSenderId = snapshot.getString("lastSenderId"),
                        readBy = readBy
                    )
                    trySend(chat)
                } else {
                    trySend(null)
                }
            }
        awaitClose { listener.remove() }
    }

    suspend fun addGroupMembers(groupId: String, newMemberUids: List<String>): Result<Unit> {
        val myUid = currentUserId ?: return Result.failure(IllegalStateException("User not authenticated"))
        if (groupId.isBlank() || newMemberUids.isEmpty()) return Result.success(Unit)

        return try {
            val groupRef = firestore.collection("chats").document(groupId)
            val doc = groupRef.get().await()
            if (!doc.exists()) return Result.failure(NoSuchElementException("Group not found"))

            @Suppress("UNCHECKED_CAST")
            val adminIds = (doc.get("adminIds") as? List<String>) ?: emptyList()
            if (!adminIds.contains(myUid)) {
                return Result.failure(IllegalStateException("Only group admins can add members"))
            }

            @Suppress("UNCHECKED_CAST")
            val currentParticipants = (doc.get("participants") as? List<String>) ?: emptyList()
            val updatedParticipants = (currentParticipants + newMemberUids).distinct()

            groupRef.update(
                mapOf(
                    "participants" to updatedParticipants,
                    "memberCount" to updatedParticipants.size,
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
            DeckKnobLogger.d(DeckKnobLogger.Tag.FIRESTORE, "Added members to group $groupId: $newMemberUids")
            Result.success(Unit)
        } catch (e: Exception) {
            DeckKnobLogger.e(DeckKnobLogger.Tag.FIRESTORE, "addGroupMembers failed: ${e.message}", e)
            Result.failure(e)
        }
    }

    suspend fun removeGroupMember(groupId: String, targetUid: String): Result<Unit> {
        val myUid = currentUserId ?: return Result.failure(IllegalStateException("User not authenticated"))
        if (groupId.isBlank() || targetUid.isBlank()) return Result.failure(IllegalArgumentException("Invalid IDs"))

        return try {
            val groupRef = firestore.collection("chats").document(groupId)
            val doc = groupRef.get().await()
            if (!doc.exists()) return Result.failure(NoSuchElementException("Group not found"))

            val ownerId = doc.getString("ownerId")
            if (targetUid == ownerId) {
                return Result.failure(IllegalStateException("The group owner cannot be removed"))
            }

            @Suppress("UNCHECKED_CAST")
            val adminIds = (doc.get("adminIds") as? List<String>) ?: emptyList()
            if (!adminIds.contains(myUid)) {
                return Result.failure(IllegalStateException("Only group admins can remove members"))
            }

            @Suppress("UNCHECKED_CAST")
            val currentParticipants = (doc.get("participants") as? List<String>) ?: emptyList()
            val updatedParticipants = currentParticipants.filter { it != targetUid }
            val updatedAdminIds = adminIds.filter { it != targetUid }

            groupRef.update(
                mapOf(
                    "participants" to updatedParticipants,
                    "adminIds" to updatedAdminIds,
                    "memberCount" to updatedParticipants.size,
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
            DeckKnobLogger.d(DeckKnobLogger.Tag.FIRESTORE, "Removed member $targetUid from group $groupId")
            Result.success(Unit)
        } catch (e: Exception) {
            DeckKnobLogger.e(DeckKnobLogger.Tag.FIRESTORE, "removeGroupMember failed: ${e.message}", e)
            Result.failure(e)
        }
    }

    suspend fun leaveGroup(groupId: String): Result<Unit> {
        val myUid = currentUserId ?: return Result.failure(IllegalStateException("User not authenticated"))
        if (groupId.isBlank()) return Result.failure(IllegalArgumentException("Invalid group ID"))

        return try {
            val groupRef = firestore.collection("chats").document(groupId)
            val doc = groupRef.get().await()
            if (!doc.exists()) return Result.failure(NoSuchElementException("Group not found"))

            val ownerId = doc.getString("ownerId")
            if (myUid == ownerId) {
                return Result.failure(IllegalStateException("Group owner must transfer ownership before leaving the group"))
            }

            @Suppress("UNCHECKED_CAST")
            val currentParticipants = (doc.get("participants") as? List<String>) ?: emptyList()
            val updatedParticipants = currentParticipants.filter { it != myUid }

            groupRef.update(
                mapOf(
                    "participants" to updatedParticipants,
                    "memberCount" to updatedParticipants.size,
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
            DeckKnobLogger.d(DeckKnobLogger.Tag.FIRESTORE, "User $myUid left group $groupId")
            Result.success(Unit)
        } catch (e: Exception) {
            DeckKnobLogger.e(DeckKnobLogger.Tag.FIRESTORE, "leaveGroup failed: ${e.message}", e)
            Result.failure(e)
        }
    }

    suspend fun updateGroupInfo(groupId: String, name: String, description: String?): Result<Unit> {
        val myUid = currentUserId ?: return Result.failure(IllegalStateException("User not authenticated"))
        val trimmedName = name.trim()
        if (trimmedName.isEmpty()) return Result.failure(IllegalArgumentException("Group name cannot be empty"))

        return try {
            val groupRef = firestore.collection("chats").document(groupId)
            val doc = groupRef.get().await()
            if (!doc.exists()) return Result.failure(NoSuchElementException("Group not found"))

            @Suppress("UNCHECKED_CAST")
            val adminIds = (doc.get("adminIds") as? List<String>) ?: emptyList()
            if (!adminIds.contains(myUid)) {
                return Result.failure(IllegalStateException("Only group admins can update group information"))
            }

            groupRef.update(
                mapOf(
                    "name" to trimmedName,
                    "description" to (description?.trim()?.ifBlank { null }),
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
            DeckKnobLogger.d(DeckKnobLogger.Tag.FIRESTORE, "Updated group info for $groupId: name=$trimmedName")
            Result.success(Unit)
        } catch (e: Exception) {
            DeckKnobLogger.e(DeckKnobLogger.Tag.FIRESTORE, "updateGroupInfo failed: ${e.message}", e)
            Result.failure(e)
        }
    }

    suspend fun transferOwnership(groupId: String, newOwnerUid: String): Result<Unit> {
        val myUid = currentUserId ?: return Result.failure(IllegalStateException("User not authenticated"))
        if (groupId.isBlank() || newOwnerUid.isBlank()) return Result.failure(IllegalArgumentException("Invalid IDs"))

        return try {
            val groupRef = firestore.collection("chats").document(groupId)
            val doc = groupRef.get().await()
            if (!doc.exists()) return Result.failure(NoSuchElementException("Group not found"))

            val ownerId = doc.getString("ownerId")
            if (myUid != ownerId) {
                return Result.failure(IllegalStateException("Only the current owner can transfer ownership"))
            }

            @Suppress("UNCHECKED_CAST")
            val adminIds = (doc.get("adminIds") as? List<String>) ?: emptyList()
            val updatedAdminIds = (adminIds + newOwnerUid).distinct()

            groupRef.update(
                mapOf(
                    "ownerId" to newOwnerUid,
                    "adminIds" to updatedAdminIds,
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()
            DeckKnobLogger.d(DeckKnobLogger.Tag.FIRESTORE, "Transferred ownership of $groupId to $newOwnerUid")
            Result.success(Unit)
        } catch (e: Exception) {
            DeckKnobLogger.e(DeckKnobLogger.Tag.FIRESTORE, "transferOwnership failed: ${e.message}", e)
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
                    DeckKnobLogger.w(DeckKnobLogger.Tag.FIRESTORE, "observeMessages error for $chatId: ${error.message}")
                    return@addSnapshotListener
                }
                if (snapshot != null) {
                    val messages = snapshot.documents.mapNotNull { doc ->
                        ChatMessageDto(
                            id = doc.id,
                            senderId = doc.getString("senderId") ?: "",
                            senderName = doc.getString("senderName"),
                            senderAvatar = doc.getString("senderAvatar"),
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
            // Include sender profile metadata for groups and rich previews
            val myProfile = authRepository.fetchUserProfile(myUid)
            val senderName = myProfile?.name?.ifBlank { myProfile.username } ?: myProfile?.username

            val messageData = hashMapOf(
                "senderId" to myUid,
                "senderName" to senderName,
                "senderAvatar" to myProfile?.profilePic,
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
                    "readBy" to listOf(myUid),
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            ).await()

            DeckKnobLogger.d(DeckKnobLogger.Tag.FIRESTORE, "Message dispatched in chat $chatId: msgId=${msgRef.id}")
            Result.success(msgRef.id)
        } catch (e: Exception) {
            DeckKnobLogger.e(DeckKnobLogger.Tag.FIRESTORE, "sendMessage failed: ${e.message}", e)
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
                    DeckKnobLogger.w(DeckKnobLogger.Tag.FIRESTORE, "observeUserChats error: ${error.message}")
                    return@addSnapshotListener
                }
                if (snapshot != null) {
                    val chats = snapshot.documents.mapNotNull { doc ->
                        @Suppress("UNCHECKED_CAST")
                        val participants = (doc.get("participants") as? List<String>) ?: emptyList()
                        @Suppress("UNCHECKED_CAST")
                        val adminIds = (doc.get("adminIds") as? List<String>) ?: emptyList()
                        @Suppress("UNCHECKED_CAST")
                        val readBy = (doc.get("readBy") as? List<String>) ?: emptyList()

                        ChatDto(
                            id = doc.id,
                            type = doc.getString("type") ?: "direct",
                            name = doc.getString("name"),
                            description = doc.getString("description"),
                            imageUrl = doc.getString("imageUrl"),
                            ownerId = doc.getString("ownerId"),
                            adminIds = adminIds,
                            memberCount = doc.getLong("memberCount")?.toInt() ?: participants.size,
                            participants = participants,
                            lastMessage = doc.getString("lastMessage"),
                            lastMessageAt = doc.getTimestamp("lastMessageAt"),
                            lastSenderId = doc.getString("lastSenderId"),
                            readBy = readBy
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
