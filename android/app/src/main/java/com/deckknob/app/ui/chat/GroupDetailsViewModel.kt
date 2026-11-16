package com.deckknob.app.ui.chat

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.deckknob.app.data.model.ChatDto
import com.deckknob.app.data.model.UserDto
import com.deckknob.app.data.repository.ChatRepository
import com.deckknob.app.data.repository.SocialRepository
import com.deckknob.app.util.DeckKnobLogger
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class GroupDetailsViewModel @Inject constructor(
    private val chatRepository: ChatRepository,
    private val socialRepository: SocialRepository
) : ViewModel() {

    var currentGroup by mutableStateOf<ChatDto?>(null)
        private set

    var members by mutableStateOf<List<UserDto>>(emptyList())
        private set

    var isLoading by mutableStateOf(false)
        private set

    var errorMessage by mutableStateOf<String?>(null)

    var hasLeftGroup by mutableStateOf(false)
        private set

    // Add Member Search
    var addMemberQuery by mutableStateOf("")
    private val _addMemberResults = MutableStateFlow<List<UserDto>>(emptyList())
    val addMemberResults: StateFlow<List<UserDto>> = _addMemberResults.asStateFlow()
    var isSearchingMembers by mutableStateOf(false)
        private set

    private var searchJob: Job? = null

    val currentUserId: String?
        get() = chatRepository.currentUserId

    val isOwner: Boolean
        get() = currentGroup?.ownerId == currentUserId

    val isAdmin: Boolean
        get() = isOwner || (currentGroup?.adminIds?.contains(currentUserId) == true)

    fun initialize(groupId: String) {
        if (groupId.isBlank()) return
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            try {
                launch {
                    chatRepository.observeChat(groupId).collectLatest { chat ->
                        if (chat != null) {
                            currentGroup = chat
                            loadMembers(chat.participants)
                        }
                    }
                }
            } catch (e: Exception) {
                DeckKnobLogger.e(DeckKnobLogger.Tag.FIRESTORE, "GroupDetails error: ${e.message}", e)
                errorMessage = e.localizedMessage
            } finally {
                isLoading = false
            }
        }
    }

    private suspend fun loadMembers(uids: List<String>) {
        val loaded = uids.mapNotNull { uid ->
            chatRepository.getOtherUser(uid)
        }
        members = loaded
    }

    fun onSearchAddMembers(query: String) {
        addMemberQuery = query
        searchJob?.cancel()
        val trimmed = query.trim()
        if (trimmed.length < 2) {
            _addMemberResults.value = emptyList()
            isSearchingMembers = false
            return
        }

        searchJob = viewModelScope.launch {
            delay(300)
            isSearchingMembers = true
            val result = socialRepository.searchUsers(trimmed)
            result.onSuccess { users ->
                val currentParticipants = currentGroup?.participants.orEmpty()
                _addMemberResults.value = users.filter { !currentParticipants.contains(it.uid) }
            }
            isSearchingMembers = false
        }
    }

    fun addMemberToGroup(user: UserDto) {
        val groupId = currentGroup?.id ?: return
        viewModelScope.launch {
            errorMessage = null
            val result = chatRepository.addGroupMembers(groupId, listOf(user.uid))
            result.onFailure { err ->
                errorMessage = err.localizedMessage ?: "Failed to add member"
            }
            addMemberQuery = ""
            _addMemberResults.value = emptyList()
        }
    }

    fun removeMemberFromGroup(targetUid: String) {
        val groupId = currentGroup?.id ?: return
        viewModelScope.launch {
            errorMessage = null
            val result = chatRepository.removeGroupMember(groupId, targetUid)
            result.onFailure { err ->
                errorMessage = err.localizedMessage ?: "Failed to remove member"
            }
        }
    }

    fun leaveGroup() {
        val groupId = currentGroup?.id ?: return
        viewModelScope.launch {
            errorMessage = null
            val result = chatRepository.leaveGroup(groupId)
            result.onSuccess {
                hasLeftGroup = true
            }.onFailure { err ->
                errorMessage = err.localizedMessage ?: "Failed to leave group"
            }
        }
    }

    fun transferOwnership(newOwnerUid: String) {
        val groupId = currentGroup?.id ?: return
        viewModelScope.launch {
            errorMessage = null
            val result = chatRepository.transferOwnership(groupId, newOwnerUid)
            result.onFailure { err ->
                errorMessage = err.localizedMessage ?: "Failed to transfer ownership"
            }
        }
    }

    fun updateGroupInfo(name: String, description: String?) {
        val groupId = currentGroup?.id ?: return
        viewModelScope.launch {
            errorMessage = null
            val result = chatRepository.updateGroupInfo(groupId, name, description)
            result.onFailure { err ->
                errorMessage = err.localizedMessage ?: "Failed to update group information"
            }
        }
    }
}
