package com.deckknob.app.ui.chat

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
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
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class CreateGroupViewModel @Inject constructor(
    private val chatRepository: ChatRepository,
    private val socialRepository: SocialRepository
) : ViewModel() {

    var groupName by mutableStateOf("")
    var groupDescription by mutableStateOf("")
    var searchQuery by mutableStateOf("")

    private val _selectedMembers = MutableStateFlow<List<UserDto>>(emptyList())
    val selectedMembers: StateFlow<List<UserDto>> = _selectedMembers.asStateFlow()

    private val _searchResults = MutableStateFlow<List<UserDto>>(emptyList())
    val searchResults: StateFlow<List<UserDto>> = _searchResults.asStateFlow()

    var isSearching by mutableStateOf(false)
        private set

    var isCreating by mutableStateOf(false)
        private set

    var errorMessage by mutableStateOf<String?>(null)

    var createdGroupId by mutableStateOf<String?>(null)
        private set

    private var searchJob: Job? = null

    fun onSearchQueryChanged(query: String) {
        searchQuery = query
        searchJob?.cancel()
        val trimmed = query.trim()
        if (trimmed.length < 2) {
            _searchResults.value = emptyList()
            isSearching = false
            return
        }

        searchJob = viewModelScope.launch {
            delay(300)
            isSearching = true
            val result = socialRepository.searchUsers(trimmed)
            result.onSuccess { users ->
                val myUid = chatRepository.currentUserId
                _searchResults.value = users.filter { it.uid != myUid }
            }.onFailure { err ->
                DeckKnobLogger.w(DeckKnobLogger.Tag.FIRESTORE, "Search error in CreateGroup: ${err.message}")
            }
            isSearching = false
        }
    }

    fun toggleMember(user: UserDto) {
        val current = _selectedMembers.value.toMutableList()
        val index = current.indexOfFirst { it.uid == user.uid }
        if (index >= 0) {
            current.removeAt(index)
        } else {
            current.add(user)
        }
        _selectedMembers.value = current
    }

    fun removeMember(user: UserDto) {
        _selectedMembers.value = _selectedMembers.value.filter { it.uid != user.uid }
    }

    fun createGroup() {
        val name = groupName.trim()
        if (name.isEmpty()) {
            errorMessage = "Group name is required"
            return
        }
        if (_selectedMembers.value.isEmpty()) {
            errorMessage = "Please add at least 1 other member to the group"
            return
        }

        viewModelScope.launch {
            isCreating = true
            errorMessage = null
            val memberUids = _selectedMembers.value.map { it.uid }
            val result = chatRepository.createGroup(
                name = name,
                description = groupDescription.trim().ifBlank { null },
                imageUrl = null,
                initialMembers = memberUids
            )
            result.onSuccess { groupId ->
                createdGroupId = groupId
            }.onFailure { err ->
                errorMessage = err.localizedMessage ?: "Failed to create group"
            }
            isCreating = false
        }
    }

    fun clearCreatedGroupId() {
        createdGroupId = null
    }
}
