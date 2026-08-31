package com.deckknob.app.data.model

import com.google.gson.annotations.SerializedName

data class LoginRequest(
    val username: String,
    val password: String
)

data class RegisterRequest(
    val username: String,
    val email: String,
    val password: String,
    val role: String = "fan"
)

data class AuthResponse(
    val access: String,
    val refresh: String,
    val user: UserDto
)

data class UserDto(
    val id: Int,
    val username: String,
    val email: String,
    @SerializedName("profile_pic") val profilePic: String?,
    @SerializedName("is_live") val isLive: Boolean
)

data class UsernameCheckResponse(
    val available: Boolean,
    val suggestions: List<String> = emptyList(),
    val error: String? = null
)
