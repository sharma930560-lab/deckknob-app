package com.deckknob.app

import com.deckknob.app.util.DeckKnobLogger
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DeckKnobLoggerTest {

    @Test
    fun testJwtTokenSanitization() {
        val sampleJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
        val logMessage = "Received authentication token: $sampleJwt for session."
        val sanitized = DeckKnobLogger.sanitize(logMessage)

        assertFalse(sanitized.contains(sampleJwt))
        assertTrue(sanitized.contains("[REDACTED_JWT]"))
    }

    @Test
    fun testPasswordSanitization() {
        val logMessage = "User login attempt with password: superSecretPassword123"
        val sanitized = DeckKnobLogger.sanitize(logMessage)

        assertFalse(sanitized.contains("superSecretPassword123"))
        assertTrue(sanitized.contains("password=[REDACTED_PASSWORD]"))
    }

    @Test
    fun testEmailCompleteRedaction() {
        val logMessage = "Profile updated for user: test.dj@deckknob.com successfully."
        val sanitized = DeckKnobLogger.sanitize(logMessage)

        assertFalse(sanitized.contains("test.dj@deckknob.com"))
        assertFalse(sanitized.contains("deckknob.com"))
        assertTrue(sanitized.contains("[REDACTED_EMAIL]"))
    }

    @Test
    fun testRealisticExceptionMessageSanitization() {
        val rawExceptionMessage = "FirebaseAuthException: No user found for bob.builder@gmail.com with password: 'mySecretPassword99'"
        val sanitized = DeckKnobLogger.sanitize(rawExceptionMessage)

        assertFalse(sanitized.contains("bob.builder@gmail.com"))
        assertFalse(sanitized.contains("mySecretPassword99"))
        assertTrue(sanitized.contains("[REDACTED_EMAIL]"))
        assertTrue(sanitized.contains("[REDACTED_PASSWORD]"))
    }

    @Test
    fun testPrivateKeySanitization() {
        val mockKey = "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0Y...\n-----END RSA PRIVATE KEY-----"
        val logMessage = "Certificate loaded:\n$mockKey"
        val sanitized = DeckKnobLogger.sanitize(logMessage)

        assertFalse(sanitized.contains("MIIEowIBAAKCAQEA0Y"))
        assertTrue(sanitized.contains("[REDACTED_PRIVATE_KEY]"))
    }

    @Test
    fun testBearerTokenSanitization() {
        val logMessage = "Authorization header: Bearer abc123xyz789_token.value"
        val sanitized = DeckKnobLogger.sanitize(logMessage)

        assertFalse(sanitized.contains("Bearer abc123xyz789_token.value"))
        assertTrue(sanitized.contains("Bearer [REDACTED_TOKEN]"))
    }

    @Test
    fun testOAuthAndApiKeySanitization() {
        val apiKey = "AIzaSyD-1234567890abcdefghijklmnopqrst"
        val oauthToken = "ya29.a0AfH6SMCL_sampleOAuthTokenValue123456"
        val logMessage = "Firebase call apiKey=$apiKey, accessToken=$oauthToken"
        val sanitized = DeckKnobLogger.sanitize(logMessage)

        assertFalse(sanitized.contains(apiKey))
        assertFalse(sanitized.contains(oauthToken))
        assertTrue(sanitized.contains("[REDACTED_API_KEY]"))
        assertTrue(sanitized.contains("[REDACTED_OAUTH_TOKEN]"))
    }

    @Test
    fun testStandardTags() {
        assertEquals("DECKKNOB_AUTH", DeckKnobLogger.Tag.AUTH.rawTag)
        assertEquals("DECKKNOB_FIRESTORE", DeckKnobLogger.Tag.FIRESTORE.rawTag)
        assertEquals("DECKKNOB_NAV", DeckKnobLogger.Tag.NAV.rawTag)
        assertEquals("DECKKNOB_UI", DeckKnobLogger.Tag.UI.rawTag)
        assertEquals("DECKKNOB_MEDIA", DeckKnobLogger.Tag.MEDIA.rawTag)
        assertEquals("DECKKNOB_PUSH", DeckKnobLogger.Tag.PUSH.rawTag)
        assertEquals("DECKKNOB_NETWORK", DeckKnobLogger.Tag.NETWORK.rawTag)
        assertEquals("DECKKNOB_LIFECYCLE", DeckKnobLogger.Tag.LIFECYCLE.rawTag)
        assertEquals("DECKKNOB_CRASH", DeckKnobLogger.Tag.CRASH.rawTag)
    }
}

