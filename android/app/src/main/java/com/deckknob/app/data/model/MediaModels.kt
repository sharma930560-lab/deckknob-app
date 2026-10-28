package com.deckknob.app.data.model

import com.google.firebase.firestore.Exclude
import com.google.firebase.firestore.IgnoreExtraProperties
import com.google.firebase.firestore.PropertyName
import com.google.firebase.firestore.ServerTimestamp
import java.util.Date

@IgnoreExtraProperties
data class PostDto(
    val id: String = "",
    val authorId: String = "",
    val authorUsername: String = "",
    val authorAvatar: String = "",
    val authorRole: String = "dj",
    @get:PropertyName("media_url") @set:PropertyName("media_url") var media_url: String = "",
    @get:PropertyName("mediaUrl") @set:PropertyName("mediaUrl") var mediaUrl: String = "",
    @get:PropertyName("media_type") @set:PropertyName("media_type") var media_type: String = "image",
    @get:PropertyName("mediaType") @set:PropertyName("mediaType") var mediaType: String = "image",
    val caption: String = "",
    @get:PropertyName("likes_count") @set:PropertyName("likes_count") var likesCount: Int = 0,
    @get:PropertyName("comments_count") @set:PropertyName("comments_count") var commentsCount: Int = 0,
    val taggedUsers: List<String> = emptyList(),
    val mentionedUsernames: List<String> = emptyList(),
    val music: MusicDto? = null,
    @get:Exclude @set:Exclude var isLiked: Boolean = false,
    @get:Exclude @set:Exclude var isBookmarked: Boolean = false,
    @ServerTimestamp val createdAt: Date? = null,
    @ServerTimestamp val updatedAt: Date? = null
) {
    val displayMediaUrl: String get() = mediaUrl.ifEmpty { media_url }
    val displayMediaType: String get() = mediaType.ifEmpty { media_type }
}

data class MusicDto(
    val id: String = "",
    val title: String = "",
    val artist: String = "",
    @get:PropertyName("audio_url") @set:PropertyName("audio_url") var audio_url: String = "",
    @get:PropertyName("audioUrl") @set:PropertyName("audioUrl") var audioUrl: String = "",
    @get:PropertyName("preview_url") @set:PropertyName("preview_url") var preview_url: String = "",
    @get:PropertyName("previewUrl") @set:PropertyName("previewUrl") var previewUrl: String = "",
    @get:PropertyName("start_time") @set:PropertyName("start_time") var start_time: Double = 0.0,
    @get:PropertyName("startTime") @set:PropertyName("startTime") var startTime: Double = 0.0,
    val duration: Double = 15.0,
    val attribution: String = ""
) {
    val displayAudioUrl: String get() = audioUrl.ifEmpty { audio_url.ifEmpty { previewUrl.ifEmpty { preview_url } } }
    val displayTitle: String get() = title.ifEmpty { "Original Sound" }
    val displayArtist: String get() = artist
}

data class ReelCommentDto(
    val id: String = "",
    val authorId: String = "",
    val authorUsername: String = "",
    val authorAvatar: String = "",
    val text: String = "",
    @ServerTimestamp val createdAt: Date? = null
)

@IgnoreExtraProperties
data class ReelDto(
    val id: String = "",
    val authorId: String = "",
    val authorUsername: String = "",
    val authorAvatar: String = "",
    val authorRole: String = "dj",
    @get:PropertyName("media_url") @set:PropertyName("media_url") var media_url: String = "",
    @get:PropertyName("mediaUrl") @set:PropertyName("mediaUrl") var mediaUrl: String = "",
    @get:PropertyName("media_type") @set:PropertyName("media_type") var media_type: String = "video",
    @get:PropertyName("mediaType") @set:PropertyName("mediaType") var mediaType: String = "video",
    val poster: String = "",
    val caption: String = "",
    @get:PropertyName("duration_seconds") @set:PropertyName("duration_seconds") var durationSeconds: Int = 0,
    @get:PropertyName("likes_count") @set:PropertyName("likes_count") var likesCount: Int = 0,
    @get:PropertyName("comments_count") @set:PropertyName("comments_count") var commentsCount: Int = 0,
    val music: MusicDto? = null,
    @get:Exclude @set:Exclude var isLiked: Boolean = false,
    @get:Exclude @set:Exclude var isBookmarked: Boolean = false,
    @ServerTimestamp val createdAt: Date? = null
) {
    val displayMediaUrl: String get() = mediaUrl.ifEmpty { media_url }
    val displayPoster: String get() = poster.ifEmpty { displayMediaUrl }
}

@IgnoreExtraProperties
data class StoryDto(
    val id: String = "",
    val authorId: String = "",
    val authorUsername: String = "",
    val authorAvatar: String = "",
    @get:PropertyName("media_url") @set:PropertyName("media_url") var media_url: String = "",
    @get:PropertyName("mediaUrl") @set:PropertyName("mediaUrl") var mediaUrl: String = "",
    @get:PropertyName("media_type") @set:PropertyName("media_type") var media_type: String = "image",
    @get:PropertyName("mediaType") @set:PropertyName("mediaType") var mediaType: String = "image",
    val caption: String = "",
    val viewers: List<String> = emptyList(),
    val music: MusicDto? = null,
    val filterName: String = "normal",
    val textOverlay: String = "",
    @ServerTimestamp val createdAt: Date? = null,
    val expiresAt: Date? = null,
    val isArchived: Boolean = false
) {
    val displayMediaUrl: String get() = mediaUrl.ifEmpty { media_url }
    val displayMediaType: String get() = mediaType.ifEmpty { media_type }
}

@IgnoreExtraProperties
data class EventDto(
    val id: String = "",
    val authorId: String = "",
    val username: String = "",
    val title: String = "",
    val venue: String = "",
    val city: String = "",
    val date: String = "",
    val time: String = "",
    val dateTimeIso: String = "",
    val image: String = "",
    @get:PropertyName("media_url") @set:PropertyName("media_url") var media_url: String = "",
    val description: String = "",
    val url: String = "",
    val ticketUrl: String = "",
    val venueWebsite: String = "",
    val lineup: List<String> = emptyList(),
    val performingDJs: List<String> = emptyList(),
    val attendees: List<String> = emptyList(),
    val status: String = "scheduled",
    @ServerTimestamp val createdAt: Date? = null
) {
    @get:Exclude val bannerImage: String get() = image.ifEmpty { media_url }
}
