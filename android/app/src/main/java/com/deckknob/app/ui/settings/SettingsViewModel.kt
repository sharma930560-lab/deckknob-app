package com.deckknob.app.ui.settings

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.deckknob.app.data.model.UserDto
import com.deckknob.app.data.repository.AuthRepository
import com.deckknob.app.data.session.SessionManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val sessionManager: SessionManager
) : ViewModel() {

    var currentUser by mutableStateOf<UserDto?>(null)
    var allSessions by mutableStateOf<List<UserDto>>(emptyList())
    var isLoading by mutableStateOf(false)
    var message by mutableStateOf<String?>(null)

    // Functional State Toggles
    var isPrivateAccount by mutableStateOf(false)
    var hideLikeCounts by mutableStateOf(false)
    var selectedRole by mutableStateOf("fan")

    // Notification Preferences
    var notifyPush by mutableStateOf(true)
    var notifyDMs by mutableStateOf(true)
    var notifyEvents by mutableStateOf(true)
    var notifyActivity by mutableStateOf(true)

    // Dialog & Sheet Visibility
    var showAccountTypeDialog by mutableStateOf(false)
    var showAccountSwitcherDialog by mutableStateOf(false)
    var showNotificationsDialog by mutableStateOf(false)
    var showHelpCenterDialog by mutableStateOf(false)
    var showReportProblemDialog by mutableStateOf(false)

    // Report a Problem State
    var reportCategory by mutableStateOf("Playback Bug")
    var reportDescription by mutableStateOf("")
    var reportEmail by mutableStateOf("")
    var isSubmittingReport by mutableStateOf(false)
    var reportSubmittedSuccessfully by mutableStateOf(false)
    var reportErrorMessage by mutableStateOf<String?>(null)

    init {
        loadSettings()
    }

    fun loadSettings() {
        viewModelScope.launch {
            isLoading = true
            sessionManager.sessions.collect { list ->
                allSessions = list
            }
        }
        viewModelScope.launch {
            val activeUid = authRepository.activeUserId.firstOrNull() ?: authRepository.currentFirebaseUser?.uid
            if (activeUid != null) {
                val profile = authRepository.fetchUserProfile(activeUid)
                currentUser = profile
                if (profile != null) {
                    isPrivateAccount = profile.isPrivate
                    hideLikeCounts = profile.hideLikes
                    selectedRole = profile.role
                    reportEmail = profile.email
                }
            }
            isLoading = false
        }
    }

    fun updateAccountPrivacy(isPrivate: Boolean) {
        isPrivateAccount = isPrivate
        viewModelScope.launch {
            authRepository.updateUserProfile(isPrivate = isPrivate)
                .onSuccess {
                    currentUser = it
                    message = if (isPrivate) "Account set to Private" else "Account set to Public"
                }
        }
    }

    fun updateLikeCountsVisibility(hide: Boolean) {
        hideLikeCounts = hide
        viewModelScope.launch {
            authRepository.updateUserProfile(hideLikes = hide)
                .onSuccess {
                    currentUser = it
                    message = if (hide) "Metrics hidden" else "Metrics visible"
                }
        }
    }

    fun updateAccountType(newRole: String) {
        selectedRole = newRole
        viewModelScope.launch {
            authRepository.updateUserProfile(role = newRole)
                .onSuccess {
                    currentUser = it
                    showAccountTypeDialog = false
                    message = "Switched to ${newRole.uppercase()} account"
                }
        }
    }

    fun switchAccount(uid: String) {
        viewModelScope.launch {
            authRepository.switchAccount(uid)
            showAccountSwitcherDialog = false
            loadSettings()
        }
    }

    fun submitReport() {
        if (reportDescription.isBlank()) {
            reportErrorMessage = "Please describe the problem."
            return
        }
        viewModelScope.launch {
            isSubmittingReport = true
            reportErrorMessage = null
            val result = authRepository.submitProblemReport(
                category = reportCategory,
                description = reportDescription.trim(),
                contactEmail = reportEmail.trim()
            )
            result.onSuccess {
                reportSubmittedSuccessfully = true
                reportDescription = ""
            }
            result.onFailure {
                reportErrorMessage = it.localizedMessage ?: "Failed to send report. Please try again."
            }
            isSubmittingReport = false
        }
    }

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
        }
    }
}

