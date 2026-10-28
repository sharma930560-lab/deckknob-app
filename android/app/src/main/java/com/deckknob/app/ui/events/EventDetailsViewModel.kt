package com.deckknob.app.ui.events

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.deckknob.app.data.model.EventDto
import com.deckknob.app.data.repository.EventRepository
import com.google.firebase.auth.FirebaseAuth
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface EventDetailsUiState {
    object Loading : EventDetailsUiState
    data class Success(
        val event: EventDto,
        val isAttending: Boolean,
        val attendeeCount: Int,
        val isRsvping: Boolean = false
    ) : EventDetailsUiState
    data class Error(val message: String) : EventDetailsUiState
}

@HiltViewModel
class EventDetailsViewModel @Inject constructor(
    private val eventRepository: EventRepository,
    private val auth: FirebaseAuth
) : ViewModel() {

    val currentUid: String get() = auth.currentUser?.uid ?: ""

    var uiState by mutableStateOf<EventDetailsUiState>(EventDetailsUiState.Loading)
        private set

    private var currentEventId: String = ""

    fun loadEvent(eventId: String) {
        if (eventId.isBlank()) {
            uiState = EventDetailsUiState.Error("Invalid event ID")
            return
        }
        currentEventId = eventId
        uiState = EventDetailsUiState.Loading
        viewModelScope.launch {
            val result = eventRepository.getEvent(eventId)
            result.onSuccess { event ->
                val isAttending = currentUid.isNotBlank() && event.attendees.contains(currentUid)
                uiState = EventDetailsUiState.Success(
                    event = event,
                    isAttending = isAttending,
                    attendeeCount = event.attendees.size
                )
            }.onFailure { err ->
                val msg = err.message ?: "Failed to load event details"
                uiState = EventDetailsUiState.Error(msg)
            }
        }
    }

    fun toggleRsvp() {
        val currentState = uiState as? EventDetailsUiState.Success ?: return
        if (currentUid.isBlank()) {
            // Unauthenticated
            return
        }
        val targetEvent = currentState.event
        val prevAttending = currentState.isAttending
        val prevCount = currentState.attendeeCount

        // Optimistic update
        val nextAttending = !prevAttending
        val nextCount = if (nextAttending) prevCount + 1 else (prevCount - 1).coerceAtLeast(0)
        uiState = currentState.copy(
            isAttending = nextAttending,
            attendeeCount = nextCount,
            isRsvping = true
        )

        viewModelScope.launch {
            val result = eventRepository.toggleRsvp(targetEvent.id)
            result.onSuccess { confirmedAttending ->
                val confirmedCount = if (confirmedAttending) {
                    if (prevAttending) prevCount else prevCount + 1
                } else {
                    if (!prevAttending) prevCount else (prevCount - 1).coerceAtLeast(0)
                }
                uiState = currentState.copy(
                    isAttending = confirmedAttending,
                    attendeeCount = confirmedCount,
                    isRsvping = false
                )
            }.onFailure {
                // Rollback on failure
                uiState = currentState.copy(
                    isAttending = prevAttending,
                    attendeeCount = prevCount,
                    isRsvping = false
                )
            }
        }
    }
}

