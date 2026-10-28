package com.deckknob.app.data.model

import com.google.firebase.firestore.IgnoreExtraProperties
import com.google.firebase.firestore.PropertyName

@IgnoreExtraProperties
data class UserDto(
    val uid: String = "",
    val username: String = "",
    val name: String = "",
    val email: String = "",
    @get:PropertyName("profile_pic") @set:PropertyName("profile_pic") var profilePic: String? = "",
    @get:PropertyName("cover_photo") @set:PropertyName("cover_photo") var coverPhoto: String? = "",
    @get:PropertyName("is_live") @set:PropertyName("is_live") var isLive: Boolean = false,
    val role: String = "fan",
    val bio: String = "",
    val city: String = "",
    val genre: String = "",
    val website: String = "",
    val instagram: String = "",
    val soundcloud: String = "",
    val youtube: String = "",
    @get:PropertyName("is_private") @set:PropertyName("is_private") var isPrivate: Boolean = false,
    @get:PropertyName("hide_likes") @set:PropertyName("hide_likes") var hideLikes: Boolean = false,
    @get:PropertyName("followers_count") @set:PropertyName("followers_count") var followersCount: Int = 0,
    @get:PropertyName("following_count") @set:PropertyName("following_count") var followingCount: Int = 0,
    @get:PropertyName("posts_count") @set:PropertyName("posts_count") var postsCount: Int = 0,
    @get:PropertyName("demoPlaylists") @set:PropertyName("demoPlaylists") var demoPlaylists: List<DemoPlaylistDto> = emptyList(),
    var accessToken: String? = ""
)

data class DemoTrackDto(
    val id: String = "",
    val title: String = "",
    @get:PropertyName("audioUrl") @set:PropertyName("audioUrl") var audioUrl: String = "",
    val duration: Int = 180,
    val format: String = "mp3",
    val size: Long = 0L,
    val order: Int = 0,
    val bpm: Int? = null,
    val key: String? = null
)

data class DemoPlaylistDto(
    val id: String = "",
    val title: String = "",
    val description: String = "",
    val visibility: String = "public",
    val ownershipAttested: Boolean = true,
    val tracks: List<DemoTrackDto> = emptyList(),
    val createdAt: String = ""
)

data class UsernameMapping(
    val uid: String = ""
)

data class RegisterRequest(
    val username: String,
    val email: String,
    val password: String,
    val role: String = "fan"
)

data class LoginRequest(
    val username_or_email: String,
    val password: String
)

data class AuthResponse(
    val access: String,
    val refresh: String,
    val user: UserDto? = null
)

data class UsernameCheckResponse(
    val available: Boolean,
    val suggestions: List<String> = emptyList()
)
