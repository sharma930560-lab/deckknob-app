package com.deckknob.app

import com.deckknob.app.network.DeckKnobMessagingService
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class NetworkAndMessagingTest {

    @Test
    fun testBuildConfigBaseUrlPresent() {
        val baseUrl = BuildConfig.BASE_URL
        assertNotNull("BASE_URL must not be null", baseUrl)
        assertTrue("BASE_URL must start with http:// or https://", baseUrl.startsWith("http://") || baseUrl.startsWith("https://"))
        assertTrue("BASE_URL must end with trailing slash", baseUrl.endsWith("/"))
    }

    @Test
    fun testNotificationChannelIdConsistency() {
        assertEquals("deckknob_alerts", DeckKnobMessagingService.CHANNEL_ID)
    }
}

