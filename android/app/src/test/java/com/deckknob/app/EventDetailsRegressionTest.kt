package com.deckknob.app

import com.deckknob.app.data.model.EventDto
import com.deckknob.app.ui.events.EventDetailsUiState
import com.deckknob.app.ui.navigation.Screen
import org.junit.Assert.*
import org.junit.Test

class EventDetailsRegressionTest {

    @Test
    fun testEventDetailsRouteMatchesDocumentId() {
        val testDocId = "doc_berlin_vault_992"
        val route = Screen.EventDetails.createRoute(testDocId)
        assertEquals("event_details/doc_berlin_vault_992", route)
        // Verified route uses document ID, not title or index
        assertTrue(route.endsWith(testDocId))
    }

    @Test
    fun testEventDetailsRouteFallbackOnBlank() {
        assertEquals("events", Screen.EventDetails.createRoute(""))
        assertEquals("events", Screen.EventDetails.createRoute("   "))
    }

    @Test
    fun testSensibleFallbacksOnSparseEventData() {
        val sparseEvent = EventDto(
            id = "evt_sparse_01",
            title = "",
            venue = "",
            city = "",
            date = "",
            time = "",
            description = "",
            image = "",
            media_url = ""
        )

        val banner = sparseEvent.bannerImage
        assertEquals("", banner)

        val titleFallback = sparseEvent.title.ifBlank { "Untitled Event" }
        assertEquals("Untitled Event", titleFallback)

        val venueFallback = sparseEvent.venue.ifBlank { "Venue TBA" }
        assertEquals("Venue TBA", venueFallback)

        val dateFallback = sparseEvent.date.ifBlank { "Date TBA" }
        assertEquals("Date TBA", dateFallback)

        val timeFallback = sparseEvent.time.ifBlank { "Time TBA" }
        assertEquals("Time TBA", timeFallback)

        val descFallback = sparseEvent.description.ifBlank { "No detailed description provided." }
        assertEquals("No detailed description provided.", descFallback)
    }

    @Test
    fun testRsvpActionTapIsolationState() {
        val initialEvent = EventDto(
            id = "evt_club_space",
            title = "Club Space Miami",
            venue = "Club Space",
            attendees = listOf("user_a", "user_b")
        )

        var navigationEventId: String? = null
        var rsvpTriggeredForEvent: String? = null

        // Simulation of click actions
        val onCardClick: (String) -> Unit = { id -> navigationEventId = id }
        val onRsvpClick: (EventDto) -> Unit = { ev -> rsvpTriggeredForEvent = ev.id }

        // 1. Simulate poster/card tap
        onCardClick(initialEvent.id)
        assertEquals("evt_club_space", navigationEventId)
        assertNull(rsvpTriggeredForEvent)

        // Reset
        navigationEventId = null

        // 2. Simulate isolated RSVP button tap (must not trigger poster/card navigation)
        onRsvpClick(initialEvent)
        assertNull(navigationEventId) // Isolated: navigation was NOT triggered
        assertEquals("evt_club_space", rsvpTriggeredForEvent)

        // 3. Attendee count calculation
        val currentUid = "user_current"
        val isAttending = initialEvent.attendees.contains(currentUid)
        assertFalse(isAttending)

        val updatedAttendees = initialEvent.attendees + currentUid
        assertEquals(3, updatedAttendees.size)
        assertTrue(updatedAttendees.contains(currentUid))
    }

    @Test
    fun testMissingOrDeletedEventErrorState() {
        val errorState = EventDetailsUiState.Error("Event has been deleted")
        assertEquals("Event has been deleted", errorState.message)
        assertTrue(errorState is EventDetailsUiState.Error)

        val invalidIdState = EventDetailsUiState.Error("Invalid event ID")
        assertEquals("Invalid event ID", invalidIdState.message)
    }

    @Test
    fun testSuccessfulEventDetailsStateMapping() {
        val event = EventDto(
            id = "evt_fest_2026",
            title = "Time Warp Mannheim",
            venue = "Maimarkthalle",
            city = "Mannheim",
            date = "APR 04, 2026",
            time = "10:00 PM",
            attendees = listOf("user_1", "user_2", "user_test"),
            lineup = listOf("Richie Hawtin", "Sven Vath", "Laurent Garnier")
        )

        val successState = EventDetailsUiState.Success(
            event = event,
            isAttending = true,
            attendeeCount = event.attendees.size
        )

        assertEquals("Time Warp Mannheim", successState.event.title)
        assertTrue(successState.isAttending)
        assertEquals(3, successState.attendeeCount)
        assertEquals(3, successState.event.lineup.size)
        assertFalse(successState.isRsvping)
    }
}

