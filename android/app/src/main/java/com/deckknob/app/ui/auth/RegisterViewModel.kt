package com.deckknob.app.ui.auth

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.deckknob.app.data.model.RegisterRequest
import com.deckknob.app.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@OptIn(FlowPreview::class)
@HiltViewModel
class RegisterViewModel @Inject constructor(
    private val repository: AuthRepository
) : ViewModel() {

    var username by mutableStateOf("")
    var email by mutableStateOf("")
    var password by mutableStateOf("")
    var role by mutableStateOf("fan")
    
    var isCheckingUsername by mutableStateOf(false)
    var isUsernameAvailable by mutableStateOf<Boolean?>(null)
    var suggestions by mutableStateOf<List<String>>(emptyList())
    
    var isLoading by mutableStateOf(false)
    var error by mutableStateOf<String?>(null)
    var registerSuccess by mutableStateOf(false)

    private val _usernameFlow = MutableStateFlow("")

    init {
        _usernameFlow
            .debounce(500)
            .filter { it.length >= 3 }
            .onEach { 
                isCheckingUsername = true
                isUsernameAvailable = null
            }
            .map { repository.checkUsername(it) }
            .onEach { result ->
                isCheckingUsername = false
                result.onSuccess { 
                    isUsernameAvailable = it.available
                    suggestions = it.suggestions
                }
            }
            .launchIn(viewModelScope)
    }

    fun onUsernameChange(value: String) {
        val cleaned = value.lowercase().replace(Regex("[^a-z0-9_]"), "")
        username = cleaned
        _usernameFlow.value = cleaned
        if (cleaned.length < 3) {
            isUsernameAvailable = null
            suggestions = emptyList()
        }
    }

    fun onRegisterClick() {
        if (isUsernameAvailable == false) {
            error = "Please choose an available username"
            return
        }
        
        viewModelScope.launch {
            isLoading = true
            error = null
            val result = repository.register(RegisterRequest(username, email, password, role))
            result.onSuccess {
                registerSuccess = true
            }
            result.onFailure {
                error = it.message ?: "Registration failed"
            }
            isLoading = false
        }
    }
}
