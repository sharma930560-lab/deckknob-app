package com.deckknob.app.ui.onboarding

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.deckknob.app.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class OnboardingViewModel @Inject constructor(
    private val repository: AuthRepository
) : ViewModel() {

    var currentStep by mutableStateOf(0)
    
    var profilePic by mutableStateOf<String?>(null) // Base64 or URL
    var city by mutableStateOf("")
    var genre by mutableStateOf("")
    var bio by mutableStateOf("")
    
    var isLoading by mutableStateOf(false)
    var error by mutableStateOf<String?>(null)
    var onboardingFinished by mutableStateOf(false)

    val genres = listOf(
        "Techno", "House", "Afro House", "Electro", "Drum & Bass",
        "Jungle", "Breaks", "Hard Groove", "Ambient", "Experimental",
        "Hip-Hop", "Trap", "Bass Music", "Other"
    )

    fun nextStep() {
        if (currentStep < 3) {
            currentStep++
        } else {
            finish()
        }
    }

    fun prevStep() {
        if (currentStep > 0) {
            currentStep--
        }
    }

    private fun finish() {
        viewModelScope.launch {
            isLoading = true
            // In a real app, I'd have a 'updateProfile' call in repository
            // For now, let's simulate success
            kotlinx.coroutines.delay(1000)
            onboardingFinished = true
            isLoading = false
        }
    }
}
