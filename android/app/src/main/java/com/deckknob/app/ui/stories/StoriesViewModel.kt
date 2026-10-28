package com.deckknob.app.ui.stories

import android.net.Uri
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.deckknob.app.data.model.MusicDto
import com.deckknob.app.data.model.StoryDto
import com.deckknob.app.data.repository.StoryRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class StoriesViewModel @Inject constructor(
    private val storyRepository: StoryRepository
) : ViewModel() {

    var stories by mutableStateOf<List<StoryDto>>(emptyList())
    var isLoading by mutableStateOf(false)

    var showCreateStoryDialog by mutableStateOf(false)
    var selectedMediaUri by mutableStateOf<Uri?>(null)
    var selectedMediaType by mutableStateOf("image")
    var caption by mutableStateOf("")
    var filterName by mutableStateOf("normal")
    var textOverlay by mutableStateOf("")
    var attachedMusic by mutableStateOf<MusicDto?>(null)
    var brightness by mutableFloatStateOf(0f)
    var contrast by mutableFloatStateOf(1f)
    var saturation by mutableFloatStateOf(1f)
    var isUploading by mutableStateOf(false)

    init {
        loadStories()
    }

    fun loadStories() {
        viewModelScope.launch {
            isLoading = true
            val result = storyRepository.getActiveStories()
            result.onSuccess { stories = it }
            isLoading = false
        }
    }

    fun resetStoryEditor() {
        showCreateStoryDialog = false
        selectedMediaUri = null
        selectedMediaType = "image"
        caption = ""
        filterName = "normal"
        textOverlay = ""
        attachedMusic = null
        brightness = 0f
        contrast = 1f
        saturation = 1f
        isUploading = false
    }

    fun submitStory() {
        val uri = selectedMediaUri ?: return
        viewModelScope.launch {
            isUploading = true
            val result = storyRepository.createStory(
                mediaUri = uri,
                mediaType = selectedMediaType,
                caption = caption,
                music = attachedMusic,
                filterName = filterName,
                textOverlay = textOverlay
            )
            result.onSuccess {
                resetStoryEditor()
                loadStories()
            }
            isUploading = false
        }
    }
}
