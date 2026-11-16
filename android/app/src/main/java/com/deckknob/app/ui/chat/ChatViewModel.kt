package com.deckknob.app.ui.chat

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.deckknob.app.data.model.ChatDto
import com.deckknob.app.data.model.ChatMessageDto
import com.deckknob.app.data.model.UserDto
import com.deckknob.app.data.repository.ChatRepository
import com.deckknob.app.util.DeckKnobLogger
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ChatViewModel @Inject constructor(
    private val chatRepository: ChatRepository
) : ViewModel() {

    var recipientUser by mutableStateOf<UserDto?>(null)
        private set

    var currentChat by mutableStateOf<ChatDto?>(null)
        private set

    var currentChatId by mutableStateOf<String?>(null)
        private set

    var messageInput by mutableStateOf("")

    var isSending by mutableStateOf(false)
        private set

    var isLoading by mutableStateOf(false)
        private set

    var errorMessage by mutableStateOf<String?>(null)

    private val _messages = MutableStateFlow<List<ChatMessageDto>>(emptyList())
    val messages: StateFlow<List<ChatMessageDto>> = _messages.asStateFlow()

    private val _userChats = MutableStateFlow<List<ChatDto>>(emptyList())
    val userChats: StateFlow<List<ChatDto>> = _userChats.asStateFlow()

    val currentUserId: String?
        get() = chatRepository.currentUserId

    fun sanitizeError(e: Throwable?): String {
        val msg = e?.message.orEmpty()
        return when {
            msg.contains("PERMISSION_DENIED", ignoreCase = true) || msg.contains("insufficient permissions", ignoreCase = true) ->
                "Access restricted. You do not have permission to view or participate in this conversation."
            msg.contains("UNAVAILABLE", ignoreCase = true) || msg.contains("network", ignoreCase = true) ->
                "Connection failed. Please check your internet connection."
            msg.contains("NOT_FOUND", ignoreCase = true) ->
                "Conversation not found."
            else -> e?.localizedMessage ?: "An unexpected error occurred"
        }
    }

    fun initializeChat(targetUid: String) {
        if (targetUid.isBlank()) return
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            try {
                recipientUser = chatRepository.getOtherUser(targetUid)
                val result = chatRepository.getOrCreateChat(targetUid)
                result.onSuccess { chatId ->
                    currentChatId = chatId
                    launch {
                        chatRepository.observeChat(chatId).collectLatest { chat ->
                            currentChat = chat
                        }
                    }
                    launch {
                        chatRepository.observeMessages(chatId).collectLatest { msgs ->
                            _messages.value = msgs
                        }
                    }
                }.onFailure { err ->
                    DeckKnobLogger.e(DeckKnobLogger.Tag.FIRESTORE, "initializeChat failure: ${err.message}", err)
                    errorMessage = sanitizeError(err)
                }
            } catch (e: Exception) {
                DeckKnobLogger.e(DeckKnobLogger.Tag.FIRESTORE, "initializeChat exception: ${e.message}", e)
                errorMessage = sanitizeError(e)
            } finally {
                isLoading = false
            }
        }
    }

    fun initializeGroupChat(groupId: String) {
        if (groupId.isBlank()) return
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            try {
                currentChatId = groupId
                val detailsResult = chatRepository.getChatDetails(groupId)
                detailsResult.onSuccess { chat ->
                    currentChat = chat
                }.onFailure { err ->
                    errorMessage = sanitizeError(err)
                }

                launch {
                    chatRepository.observeChat(groupId).collectLatest { chat ->
                        if (chat != null) {
                            currentChat = chat
                        }
                    }
                }
                launch {
                    chatRepository.observeMessages(groupId).collectLatest { msgs ->
                        _messages.value = msgs
                    }
                }
            } catch (e: Exception) {
                DeckKnobLogger.e(DeckKnobLogger.Tag.FIRESTORE, "initializeGroupChat exception: ${e.message}", e)
                errorMessage = sanitizeError(e)
            } finally {
                isLoading = false
            }
        }
    }

    fun sendMessage() {
        val chatId = currentChatId ?: return
        val text = messageInput.trim()
        if (text.isEmpty() || isSending) return

        viewModelScope.launch {
            isSending = true
            errorMessage = null
            val result = chatRepository.sendMessage(chatId, text)
            result.onSuccess {
                messageInput = ""
            }.onFailure { err ->
                DeckKnobLogger.e(DeckKnobLogger.Tag.FIRESTORE, "sendMessage failure: ${err.message}", err)
                errorMessage = sanitizeError(err)
            }
            isSending = false
        }
    }

    fun loadUserChats() {
        viewModelScope.launch {
            val myUid = currentUserId ?: return@launch
            chatRepository.observeUserChats().collectLatest { chats ->
                val enrichedChats = chats.map { chat ->
                    if (!chat.isGroup) {
                        val otherUid = chat.participants.firstOrNull { it != myUid }
                        val user = if (otherUid != null) chatRepository.getOtherUser(otherUid) else null
                        chat.copy(otherUser = user)
                    } else {
                        chat
                    }
                }
                _userChats.value = enrichedChats
            }
        }
    }
}
