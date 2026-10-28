package com.deckknob.app.ui.reels

import android.net.Uri
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.deckknob.app.data.model.ReelCommentDto
import com.deckknob.app.data.model.ReelDto
import com.deckknob.app.data.repository.ReelRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ReelsViewModel @Inject constructor(
    private val reelRepository: ReelRepository
) : ViewModel() {

    var reels by mutableStateOf<List<ReelDto>>(emptyList())
    var isLoading by mutableStateOf(false)
    var error by mutableStateOf<String?>(null)

    // Audio & playback
    var isGlobalMuted by mutableStateOf(false)

    // Comments bottom sheet
    var activeCommentReelId by mutableStateOf<String?>(null)
    var comments by mutableStateOf<List<ReelCommentDto>>(emptyList())
    var isLoadingComments by mutableStateOf(false)
    var newCommentText by mutableStateOf("")
    var isSubmittingComment by mutableStateOf(false)

    // Create Klyp dialog
    var showCreateReelDialog by mutableStateOf(false)
    var newReelCaption by mutableStateOf("")
    var newReelVideoUri by mutableStateOf<Uri?>(null)
    var newReelMusic by mutableStateOf<com.deckknob.app.data.model.MusicDto?>(null)
    var showMusicPicker by mutableStateOf(false)
    var isUploading by mutableStateOf(false)

    init {
        loadReels()
    }

    fun loadReels() {
        viewModelScope.launch {
            isLoading = true
            error = null
            val result = reelRepository.getReels()
            result.onSuccess { reels = it }
            result.onFailure { error = it.message }
            isLoading = false
        }
    }

    fun toggleLike(reel: ReelDto) {
        val currentlyLiked = reel.isLiked
        val newLiked = !currentlyLiked
        val newCount = (reel.likesCount + if (newLiked) 1 else -1).coerceAtLeast(0)

        // Optimistic UI update
        reels = reels.map {
            if (it.id == reel.id) {
                it.isLiked = newLiked
                it.copy(likesCount = newCount)
            } else it
        }

        viewModelScope.launch {
            val res = if (newLiked) reelRepository.likeReel(reel.id) else reelRepository.unlikeReel(reel.id)
            if (res.isFailure) {
                // Roll back on failure
                reels = reels.map {
                    if (it.id == reel.id) {
                        it.isLiked = currentlyLiked
                        it.copy(likesCount = reel.likesCount)
                    } else it
                }
                error = res.exceptionOrNull()?.message ?: "Could not update like"
            }
        }
    }

    fun toggleBookmark(reel: ReelDto) {
        val currentlyBookmarked = reel.isBookmarked
        val newBookmarked = !currentlyBookmarked

        // Optimistic UI update
        reels = reels.map {
            if (it.id == reel.id) {
                it.isBookmarked = newBookmarked
                it.copy()
            } else it
        }

        viewModelScope.launch {
            val res = reelRepository.bookmarkReel(reel.id, newBookmarked)
            if (res.isFailure) {
                // Roll back on failure
                reels = reels.map {
                    if (it.id == reel.id) {
                        it.isBookmarked = currentlyBookmarked
                        it.copy()
                    } else it
                }
                error = res.exceptionOrNull()?.message ?: "Could not update bookmark"
            }
        }
    }

    fun openComments(reelId: String) {
        activeCommentReelId = reelId
        comments = emptyList()
        isLoadingComments = true
        newCommentText = ""
        viewModelScope.launch {
            val res = reelRepository.getComments(reelId)
            res.onSuccess { comments = it }
            res.onFailure { error = it.message }
            isLoadingComments = false
        }
    }

    fun closeComments() {
        activeCommentReelId = null
        newCommentText = ""
    }

    fun sendComment() {
        val reelId = activeCommentReelId ?: return
        val text = newCommentText.trim()
        if (text.isEmpty()) return

        viewModelScope.launch {
            isSubmittingComment = true
            val res = reelRepository.addComment(reelId, text)
            res.onSuccess { newComment ->
                comments = comments + newComment
                newCommentText = ""
                reels = reels.map {
                    if (it.id == reelId) it.copy(commentsCount = it.commentsCount + 1) else it
                }
            }
            res.onFailure { error = it.message }
            isSubmittingComment = false
        }
    }

    fun toggleMute() {
        isGlobalMuted = !isGlobalMuted
    }

    fun submitReel() {
        val uri = newReelVideoUri ?: return
        viewModelScope.launch {
            isUploading = true
            val result = reelRepository.createReel(newReelCaption, uri)
            result.onSuccess {
                showCreateReelDialog = false
                newReelVideoUri = null
                newReelMusic = null
                newReelCaption = ""
                loadReels()
            }
            result.onFailure { error = it.message }
            isUploading = false
        }
    }
}
