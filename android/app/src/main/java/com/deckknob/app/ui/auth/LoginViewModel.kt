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

    fun onLoginClick() {
        if (usernameOrEmail.isBlank() || password.isBlank()) {
            error = "Please fill all fields"
            return
        }
        
        viewModelScope.launch {
            isLoading = true
            error = null
            val result = repository.login(usernameOrEmail, password)
            result.onSuccess {
                loginSuccess = true
            }
            result.onFailure {
                error = it.message ?: "Unknown error"
            }
            isLoading = false
        }
    }

    fun onGoogleSignInSuccess(idToken: String) {
        viewModelScope.launch {
            isGoogleLoading = true
            error = null
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
