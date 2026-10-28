package com.deckknob.app.ui.navigation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.deckknob.app.data.repository.AuthRepository
import com.google.firebase.auth.FirebaseAuth
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AuthState(
    val isAuthenticated: Boolean = false,
    val userId: String? = null
)

@HiltViewModel
class NavigationViewModel @Inject constructor(
    private val repository: AuthRepository,
    private val auth: FirebaseAuth
) : ViewModel() {

    private val firebaseAuthFlow: Flow<String?> = callbackFlow {
        val listener = FirebaseAuth.AuthStateListener { fbAuth ->
            trySend(fbAuth.currentUser?.uid)
        }
        auth.addAuthStateListener(listener)
        awaitClose { auth.removeAuthStateListener(listener) }
    }

    val authState: StateFlow<AuthState> = combine(
        repository.activeUserId,
        firebaseAuthFlow
    ) { localUid, firebaseUid ->
        val effectiveUid = firebaseUid ?: localUid
        val isAuth = !effectiveUid.isNullOrEmpty()
        android.util.Log.d("DeckKnobAuthDiag", "Stage 9: Root authentication state changed: isAuthenticated=$isAuth, hasUserId=${!effectiveUid.isNullOrEmpty()}")
        AuthState(isAuthenticated = isAuth, userId = effectiveUid)
    }.stateIn(
        viewModelScope,
        SharingStarted.WhileSubscribed(5000),
        AuthState(
            isAuthenticated = auth.currentUser != null,
            userId = auth.currentUser?.uid
        )
    )

    fun logout() {
        viewModelScope.launch {
            repository.logout()
        }
    }
}
