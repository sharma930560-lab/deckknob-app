package com.deckknob.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AuthValidationTest {

    private fun cleanUsername(raw: String): String {
        return raw.lowercase().replace(Regex("[^a-z0-9_]"), "")
    }

    private fun validateEmail(email: String): Boolean {
        return email.isNotBlank() && email.contains("@") && email.contains(".")
    }

    private fun validatePassword(password: String): Boolean {
        return password.length >= 6
    }

    @Test
    fun testUsernameSanitization() {
        assertEquals("dj_pulse_99", cleanUsername("DJ_Pulse_99!@#$"))
        assertEquals("undergroundsound", cleanUsername("Underground Sound "))
        assertEquals("valid_user_1", cleanUsername("valid_user_1"))
    }

    @Test
    fun testEmailValidation() {
        assertTrue(validateEmail("resident@deckknob.com"))
        assertFalse(validateEmail("invalid-email"))
        assertFalse(validateEmail(""))
        assertFalse(validateEmail("nodomain@"))
    }

    @Test
    fun testPasswordValidation() {
        assertTrue(validatePassword("secret123"))
        assertFalse(validatePassword("12345"))
        assertFalse(validatePassword(""))
    }
}
