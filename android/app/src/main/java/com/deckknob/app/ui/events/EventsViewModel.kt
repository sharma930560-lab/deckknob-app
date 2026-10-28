package com.deckknob.app.ui.events

import android.net.Uri
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.deckknob.app.data.model.EventDto
import com.deckknob.app.data.repository.EventRepository
import com.google.firebase.auth.FirebaseAuth
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class EventsViewModel @Inject constructor(
    private val eventRepository: EventRepository,
    private val auth: FirebaseAuth
) : ViewModel() {

    val currentUid: String get() = auth.currentUser?.uid ?: ""

    var events by mutableStateOf<List<EventDto>>(emptyList())
    var isLoading by mutableStateOf(false)
    var error by mutableStateOf<String?>(null)
    var successMessage by mutableStateOf<String?>(null)

    // Create Event Form State
    var showCreateEventDialog by mutableStateOf(false)
    var title by mutableStateOf("")
    var venue by mutableStateOf("")
    var city by mutableStateOf("")
    var date by mutableStateOf("")
    var time by mutableStateOf("")
    var description by mutableStateOf("")
    var url by mutableStateOf("")
    var bannerUri by mutableStateOf<Uri?>(null)
    var isPublishing by mutableStateOf(false)

    // Edit Event Form State
    var showEditEventDialog by mutableStateOf(false)
    var editingEvent by mutableStateOf<EventDto?>(null)
    var editTitle by mutableStateOf("")
    var editVenue by mutableStateOf("")
    var editCity by mutableStateOf("")
    var editDate by mutableStateOf("")
    var editTime by mutableStateOf("")
    var editDescription by mutableStateOf("")
    var editUrl by mutableStateOf("")
    var editBannerUri by mutableStateOf<Uri?>(null)
    var isSavingEdit by mutableStateOf(false)

    // Delete Event State
    var showDeleteEventDialog by mutableStateOf(false)
    var deletingEvent by mutableStateOf<EventDto?>(null)
    var isDeleting by mutableStateOf(false)

    init {
        loadEvents()
        observeRealTimeEvents()
    }

    private fun observeRealTimeEvents() {
        viewModelScope.launch {
            eventRepository.getEventsFlow()
                .catch { e ->
                    // Fall back to periodic or initial load on listener error
                    loadEvents()
                }
                .collect { updatedList ->
                    events = updatedList
                }
        }
    }

    fun loadEvents() {
        viewModelScope.launch {
            isLoading = true
            error = null
            val result = eventRepository.getEvents()
            result.onSuccess { events = it }
            result.onFailure { error = it.message }
            isLoading = false
        }
    }

    fun toggleRsvp(event: EventDto) {
        val uid = currentUid
        if (uid.isBlank()) return
        viewModelScope.launch {
            val result = eventRepository.toggleRsvp(event.id)
            result.onSuccess { nowAttending ->
                events = events.map { e ->
                    if (e.id == event.id) {
                        val newAttendees = if (nowAttending) {
                            (e.attendees + uid).distinct()
                        } else {
                            e.attendees.filter { it != uid }
                        }
                        e.copy(attendees = newAttendees)
                    } else e
                }
            }
        }
    }

    fun submitEvent() {
        if (title.isBlank() || venue.isBlank()) return
        viewModelScope.launch {
            isPublishing = true
            error = null
            val result = eventRepository.createEvent(
                title = title.trim(),
                venue = venue.trim(),
                city = city.trim().ifEmpty { "Local" },
                date = date.trim().ifEmpty { "TONIGHT" },
                time = time.trim().ifEmpty { "10:00 PM" },
                description = description.trim(),
                bannerUri = bannerUri,
                url = url.trim()
            )
            result.onSuccess {
                showCreateEventDialog = false
                title = ""
                venue = ""
                city = ""
                date = ""
                time = ""
                description = ""
                bannerUri = null
                url = ""
                successMessage = "Event published successfully!"
                loadEvents()
            }
            result.onFailure { error = it.message }
            isPublishing = false
        }
    }

    fun openEditEvent(event: EventDto) {
        editingEvent = event
        editTitle = event.title
        editVenue = event.venue
        editCity = event.city
        editDate = event.date
        editTime = event.time
        editDescription = event.description
        editUrl = event.ticketUrl.ifEmpty { event.url }
        editBannerUri = null
        showEditEventDialog = true
    }

    fun submitEditEvent() {
        val event = editingEvent ?: return
        if (editTitle.isBlank() || editVenue.isBlank()) return
        viewModelScope.launch {
            isSavingEdit = true
            error = null
            val result = eventRepository.updateEvent(
                eventId = event.id,
                title = editTitle.trim(),
                venue = editVenue.trim(),
                city = editCity.trim().ifEmpty { "Local" },
                date = editDate.trim().ifEmpty { event.date },
                time = editTime.trim().ifEmpty { event.time },
                description = editDescription.trim(),
                bannerUri = editBannerUri,
                url = editUrl.trim()
            )
            result.onSuccess {
                showEditEventDialog = false
                editingEvent = null
                editBannerUri = null
                successMessage = "Event updated successfully!"
                loadEvents()
            }
            result.onFailure { error = it.message }
            isSavingEdit = false
        }
    }

    fun openDeleteDialog(event: EventDto) {
        deletingEvent = event
        showDeleteEventDialog = true
    }

    fun confirmDeleteEvent() {
        val event = deletingEvent ?: return
        viewModelScope.launch {
            isDeleting = true
            error = null
            val result = eventRepository.deleteEvent(event.id, event.authorId)
            result.onSuccess {
                showDeleteEventDialog = false
                deletingEvent = null
                // Optimistically remove from list immediately
                events = events.filter { it.id != event.id }
                successMessage = "Event deleted."
            }
            result.onFailure { error = it.message }
            isDeleting = false
        }
    }
}
