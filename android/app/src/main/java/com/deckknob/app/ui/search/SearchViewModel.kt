package com.deckknob.app.ui.search

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.deckknob.app.data.model.UserDto
import com.deckknob.app.data.repository.AuthRepository
import com.deckknob.app.data.repository.SocialRepository
import com.deckknob.app.util.DeckKnobLogger
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SearchViewModel @Inject constructor(
    private val socialRepository: SocialRepository,
    private val authRepository: AuthRepository
) : ViewModel() {

    var searchQuery by mutableStateOf("")
    var searchResults by mutableStateOf<List<UserDto>>(emptyList())
    var isLoading by mutableStateOf(false)
    var isLoadingMore by mutableStateOf(false)
    var hasMore by mutableStateOf(false)
    var pageOffset by mutableStateOf(0)
    var error by mutableStateOf<String?>(null)
    var activeUid by mutableStateOf<String?>(null)

    val pageSize = 20

    // Tracks follow state for search results: targetUid -> Boolean
    val followingMap = mutableStateMapOf<String, Boolean>()

    private var searchJob: Job? = null

    init {
        viewModelScope.launch {
            activeUid = authRepository.activeUserId.firstOrNull() ?: authRepository.currentFirebaseUser?.uid
        }
        observeSocialSync()
    }

    private fun observeSocialSync() {
        viewModelScope.launch {
            socialRepository.followingState.collect { stateMap ->
                stateMap.forEach { (targetUid, isFollowing) ->
                    followingMap[targetUid] = isFollowing
                }
            }
        }
    }

    fun onQueryChanged(newQuery: String) {
        searchQuery = newQuery
        searchJob?.cancel()
        if (newQuery.trim().length < 2) {
            searchResults = emptyList()
            isLoading = false
            isLoadingMore = false
            hasMore = false
            pageOffset = 0
            error = null
            return
        }

        searchJob = viewModelScope.launch {
            delay(350) // Debounce 350ms
            performSearch(newQuery.trim(), isInitial = true)
        }
    }

    fun performSearch(query: String = searchQuery, isInitial: Boolean = true) {
        val trimmed = query.trim()
        if (trimmed.length < 2) return

        if (isInitial) {
            pageOffset = 0
            hasMore = false
        }

        viewModelScope.launch {
            if (isInitial) {
                isLoading = true
            } else {
                isLoadingMore = true
            }
            error = null

            socialRepository.searchUsers(trimmed, maxResults = pageSize, pageOffset = pageOffset).fold(
                onSuccess = { users ->
                    if (isInitial) {
                        searchResults = users
                    } else {
                        searchResults = (searchResults + users).distinctBy { it.uid }
                    }
                    hasMore = users.size >= pageSize
                    pageOffset += users.size
                    isLoading = false
                    isLoadingMore = false

                    // Hydrate follow status
                    val current = activeUid
                    if (current != null) {
                        for (user in users) {
                            val isFollowing = socialRepository.isFollowing(current, user.uid)
                            followingMap[user.uid] = isFollowing
                        }
                    }
                },
                onFailure = { e ->
                    DeckKnobLogger.w(DeckKnobLogger.Tag.UI, "Search error: ${e.message}")
                    error = "Failed to search users. Check connection."
                    isLoading = false
                    isLoadingMore = false
                }
            )
        }
    }

    fun loadNextPage() {
        if (isLoading || isLoadingMore || !hasMore || searchQuery.trim().length < 2) return
        performSearch(searchQuery, isInitial = false)
    }

    fun toggleFollow(targetUser: UserDto) {
        val current = activeUid ?: return
        val targetUid = targetUser.uid
        if (targetUid.isBlank() || targetUid == current) return

        val isCurrentlyFollowing = followingMap[targetUid] ?: false
        // Optimistic UI update
        followingMap[targetUid] = !isCurrentlyFollowing

        viewModelScope.launch {
            val result = if (isCurrentlyFollowing) {
                socialRepository.unfollowUser(current, targetUid)
            } else {
                val currentUserProfile = authRepository.fetchUserProfile(current)
                socialRepository.followUser(current, targetUid, currentUserProfile)
            }

            result.onFailure {
                // Revert on error
                followingMap[targetUid] = isCurrentlyFollowing
                error = "Unable to update relationship."
            }
        }
    }
}
