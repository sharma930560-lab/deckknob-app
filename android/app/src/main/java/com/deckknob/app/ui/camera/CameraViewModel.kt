package com.deckknob.app.ui.camera

import android.net.Uri
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.deckknob.app.data.repository.PostRepository
import com.deckknob.app.data.repository.ReelRepository
import com.deckknob.app.data.repository.StoryRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class CreationMode(val label: String, val subtitle: String) {
    STORY("STORY", "24-hour underground signal"),
    POST("POST", "Permanent photo feed post"),
    KLYP("KLYP", "Short vertical music video"),
    EVENT("EVENT", "Host nightlife event or stage")
}

@HiltViewModel
class CameraViewModel @Inject constructor(
    private val postRepository: PostRepository,
    private val reelRepository: ReelRepository,
    private val storyRepository: StoryRepository
) : ViewModel() {

    var selectedMode by mutableStateOf(CreationMode.STORY)
    var lensFacing by mutableIntStateOf(CameraSelector.LENS_FACING_BACK)
    var flashMode by mutableIntStateOf(ImageCapture.FLASH_MODE_OFF)

    var isRecordingVideo by mutableStateOf(false)
    var recordingDurationSeconds by mutableIntStateOf(0)
    private var recordingJob: Job? = null

    var capturedMediaUri by mutableStateOf<Uri?>(null)
    var capturedMediaType by mutableStateOf("image")
    var caption by mutableStateOf("")

    var isPublishing by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)

    fun setMode(mode: CreationMode) {
        selectedMode = mode
    }

    fun toggleLens() {
        lensFacing = if (lensFacing == CameraSelector.LENS_FACING_BACK) {
            CameraSelector.LENS_FACING_FRONT
        } else {
            CameraSelector.LENS_FACING_BACK
        }
    }

    fun toggleFlash() {
        flashMode = when (flashMode) {
            ImageCapture.FLASH_MODE_OFF -> ImageCapture.FLASH_MODE_ON
            ImageCapture.FLASH_MODE_ON -> ImageCapture.FLASH_MODE_AUTO
            else -> ImageCapture.FLASH_MODE_OFF
        }
    }

    fun onMediaCaptured(uri: Uri, type: String) {
        capturedMediaUri = uri
        capturedMediaType = type
        errorMessage = null
    }

    fun clearCapturedMedia() {
        capturedMediaUri = null
        capturedMediaType = "image"
        caption = ""
        errorMessage = null
    }

    fun startRecordingTimer() {
        isRecordingVideo = true
        recordingDurationSeconds = 0
        recordingJob?.cancel()
        recordingJob = viewModelScope.launch {
            while (isRecordingVideo && recordingDurationSeconds < 59) {
                delay(1000)
                recordingDurationSeconds++
            }
        }
    }

    fun stopRecordingTimer() {
        isRecordingVideo = false
        recordingJob?.cancel()
    }

    fun publishMedia(onSuccess: () -> Unit) {
        val uri = capturedMediaUri ?: return
        viewModelScope.launch {
            isPublishing = true
            errorMessage = null

            val result = when (selectedMode) {
                CreationMode.STORY -> {
                    storyRepository.createStory(
                        mediaUri = uri,
                        mediaType = capturedMediaType,
                        caption = caption
                    )
                }
                CreationMode.POST -> {
                    postRepository.createPost(
                        caption = caption,
                        mediaUri = uri,
                        mediaType = capturedMediaType
                    )
                }
                CreationMode.KLYP -> {
                    reelRepository.createReel(
                        caption = caption,
                        videoUri = uri,
                        durationSeconds = recordingDurationSeconds.coerceAtLeast(5)
                    )
                }
                CreationMode.EVENT -> {
                    Result.success(Unit)
                }
            }

            if (result.isSuccess) {
                clearCapturedMedia()
                onSuccess()
            } else {
                errorMessage = result.exceptionOrNull()?.message ?: "Publishing failed"
            }
            isPublishing = false
        }
    }
}

