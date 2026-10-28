package com.deckknob.app.ui.auth

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
class LoginViewModel @Inject constructor(
    private val repository: AuthRepository
) : ViewModel() {

    var usernameOrEmail by mutableStateOf("")
    var password by mutableStateOf("")
    var isLoading by mutableStateOf(false)
    var isGoogleLoading by mutableStateOf(false)
    var error by mutableStateOf<String?>(null)
    var loginSuccess by mutableStateOf(false)

    // Forgot Password State
    var isForgotPasswordDialogOpen by mutableStateOf(false)
    var forgotPasswordEmail by mutableStateOf("")
    var isResetPasswordLoading by mutableStateOf(false)
    var resetPasswordError by mutableStateOf<String?>(null)
    var resetPasswordSuccessMessage by mutableStateOf<String?>(null)

    private val emailRegex = Regex("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")

    fun onLoginClick() {
        val trimmed = usernameOrEmail.trim()
        if (trimmed.isBlank() || password.isBlank()) {
            error = "Please fill in all fields."
            return
        }

        // If the user entered an email address with '@', validate format locally
        if (trimmed.contains("@") && !emailRegex.matches(trimmed)) {
            error = "Enter a valid email address."
            return
        }

        viewModelScope.launch {
            isLoading = true
            error = null
            resetPasswordSuccessMessage = null
            val result = repository.login(trimmed, password)
            result.onSuccess {
                loginSuccess = true
            }
            result.onFailure {
                error = it.message ?: "Authentication failed. Please try again."
            }
            isLoading = false
        }
    }

    fun onForgotPasswordClick() {
        error = null
        resetPasswordSuccessMessage = null
        resetPasswordError = null
        forgotPasswordEmail = usernameOrEmail.trim()
        isForgotPasswordDialogOpen = true
    }

    fun dismissForgotPasswordDialog() {
        isForgotPasswordDialogOpen = false
        resetPasswordError = null
    }

    fun sendPasswordReset(emailInput: String? = null) {
        val target = (emailInput ?: forgotPasswordEmail).trim()
        if (target.isBlank()) {
            resetPasswordError = "Please enter your email address."
            return
        }

        if (target.contains("@") && !emailRegex.matches(target)) {
            resetPasswordError = "Enter a valid email address."
            return
        }

        viewModelScope.launch {
            isResetPasswordLoading = true
            resetPasswordError = null
            val result = repository.sendPasswordResetEmail(target)
            result.onSuccess {
                isForgotPasswordDialogOpen = false
                resetPasswordSuccessMessage = "Password reset email sent. Please check your inbox and spam folder."
                error = null
            }
            result.onFailure {
                resetPasswordError = it.message ?: "Failed to send reset email. Please try again."
            }
            isResetPasswordLoading = false
        }
    }

    fun onGoogleSignInSuccess(idToken: String) {
        viewModelScope.launch {
            isGoogleLoading = true
            error = null
            resetPasswordSuccessMessage = null
            try {
                val result = repository.signInWithGoogle(idToken)
                result.onSuccess {
                    loginSuccess = true
                }
                result.onFailure {
                    error = it.message ?: "Google Sign-In failed"
                    android.util.Log.e("DeckKnobAuthDiag", "Stage 11: LoginViewModel Google sign-in failure: ${it::class.java.simpleName}: ${it.message}")
                }
            } catch (e: Exception) {
                error = e.localizedMessage ?: "Google Sign-In failed"
                android.util.Log.e("DeckKnobAuthDiag", "Stage 11: LoginViewModel unhandled exception: ${e::class.java.simpleName}: ${e.message}")
            } finally {
                isGoogleLoading = false
            }
        }
    }

    fun onGoogleSignInError(errorMessage: String) {
        error = errorMessage
    }
}
