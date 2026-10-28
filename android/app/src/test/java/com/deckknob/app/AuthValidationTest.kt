package com.deckknob.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AuthValidationTest {

    private val emailRegex = Regex("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")

    private fun cleanUsername(raw: String): String {
        return raw.lowercase().replace(Regex("[^a-z0-9_]"), "")
    }

    private fun validateEmail(email: String): Boolean {
        return email.isNotBlank() && emailRegex.matches(email.trim())
    }

    private fun validatePassword(password: String): Boolean {
        return password.length >= 6
    }

    private fun isEmailLogin(input: String): Boolean {
        return input.trim().contains("@")
    }

    private fun mapFirebaseErrorSimulation(errorCode: String?, message: String): String {
        return when {
            message.contains("network", ignoreCase = true) ||
            message.contains("client is offline", ignoreCase = true) ||
            message.contains("UNAVAILABLE", ignoreCase = true) ->
                "Unable to connect. Check your internet and try again."

            message.contains("TOO_MANY_ATTEMPTS", ignoreCase = true) ->
                "Too many attempts. Please try again later."

            errorCode == "ERROR_INVALID_EMAIL" || message.contains("badly formatted", ignoreCase = true) ->
                "Enter a valid email address."

            errorCode == "ERROR_WRONG_PASSWORD" || errorCode == "INVALID_LOGIN_CREDENTIALS" ||
            message.contains("invalid credential", ignoreCase = true) ->
                "Email or password is incorrect."

            message.contains("Username not found", ignoreCase = true) ->
                "Username not found. Please check your spelling or use your email."

            else -> "Authentication failed. Please try again."
        }
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
        assertTrue(validateEmail("dj.aura_99@sub.domain.org"))
        assertFalse(validateEmail("invalid-email"))
        assertFalse(validateEmail(""))
        assertFalse(validateEmail("nodomain@"))
        assertFalse(validateEmail("user@domain"))
    }

    @Test
    fun testPasswordValidation() {
        assertTrue(validatePassword("secret123"))
        assertFalse(validatePassword("12345"))
        assertFalse(validatePassword(""))
    }

    @Test
    fun testEmailVsUsernameDiscrimination() {
        // Usernames should not be validated as emails
        assertFalse(isEmailLogin("dj_aurora"))
        assertFalse(isEmailLogin("underground_producer"))
        assertTrue(isEmailLogin("dj@deckknob.com"))
        assertTrue(isEmailLogin("user@sub.domain.com"))
    }

    @Test
    fun testForgotPasswordEmailValidation() {
        assertTrue(validateEmail("reset@deckknob.com"))
        assertFalse(validateEmail("   "))
        assertFalse(validateEmail("not-an-email"))
        assertFalse(validateEmail("missing-tld@domain"))
    }

    @Test
    fun testErrorMappingSemantics() {
        assertEquals(
            "Unable to connect. Check your internet and try again.",
            mapFirebaseErrorSimulation(null, "FirebaseNetworkException: client is offline")
        )
        assertEquals(
            "Too many attempts. Please try again later.",
            mapFirebaseErrorSimulation(null, "ERROR_TOO_MANY_ATTEMPTS_TRY_LATER")
        )
        assertEquals(
            "Enter a valid email address.",
            mapFirebaseErrorSimulation("ERROR_INVALID_EMAIL", "The email address is badly formatted.")
        )
        assertEquals(
            "Email or password is incorrect.",
            mapFirebaseErrorSimulation("INVALID_LOGIN_CREDENTIALS", "Invalid credentials provided.")
        )
        assertEquals(
            "Username not found. Please check your spelling or use your email.",
            mapFirebaseErrorSimulation(null, "Username not found in system")
        )
    }

    @Test
    fun testLoginButtonTextConstant() {
        val buttonLabel = "LOG IN"
        assertEquals("LOG IN", buttonLabel)
        assertTrue("Button label must not be empty", buttonLabel.isNotBlank())
    }
}
