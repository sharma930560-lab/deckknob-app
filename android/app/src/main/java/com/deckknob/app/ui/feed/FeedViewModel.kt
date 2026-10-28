package com.deckknob.app.ui.feed

import android.net.Uri
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.deckknob.app.data.model.EventDto
import com.deckknob.app.data.model.NotificationDto
import com.deckknob.app.data.model.PostDto
import com.deckknob.app.data.model.UserDto
import com.deckknob.app.data.repository.EventRepository
import com.deckknob.app.data.repository.PostRepository
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import javax.inject.Inject

val GENRE_TABS = listOf("All", "Techno", "House", "Afro House", "Drum & Bass", "Ambient")

@HiltViewModel
class FeedViewModel @Inject constructor(
    private val postRepository: PostRepository,
    private val eventRepository: EventRepository,
    private val firestore: FirebaseFirestore,
    private val auth: FirebaseAuth
) : ViewModel() {

    var posts by mutableStateOf<List<PostDto>>(emptyList())
    var isLoading by mutableStateOf(false)
    var error by mutableStateOf<String?>(null)

    // Genre Filtering
    var activeGenre by mutableStateOf("All")

    // Editorial Upcoming Events
    var upcomingEvents by mutableStateOf<List<EventDto>>(emptyList())

    // Scene Radar / Suggested DJs
    var sceneRadarDjs by mutableStateOf<List<UserDto>>(emptyList())
    var followedDjs by mutableStateOf<Set<String>>(emptySet())

    // Notifications
    var notifications by mutableStateOf<List<NotificationDto>>(emptyList())
    var showNotificationHub by mutableStateOf(false)
    var isNotificationsLoading by mutableStateOf(false)

    // Create Post Dialog
    var showCreatePostDialog by mutableStateOf(false)
    var newPostCaption by mutableStateOf("")
    var newPostMediaUri by mutableStateOf<Uri?>(null)
    var newPostMediaType by mutableStateOf("image")
    var newPostMusic by mutableStateOf<com.deckknob.app.data.model.MusicDto?>(null)
    var showMusicPicker by mutableStateOf(false)
    var isPosting by mutableStateOf(false)

    init {
        loadFeed()
        loadUpcomingEvents()
        loadSceneRadar()
        loadNotifications()
    }

    val filteredPosts: List<PostDto>
        get() {
            if (activeGenre == "All") return posts
            val kw = activeGenre.lowercase().replace(" ", "")
            val kw2 = activeGenre.lowercase()
            return posts.filter { p ->
                val cap = p.caption.lowercase()
                cap.contains(kw) || cap.contains(kw2) || cap.contains("#$kw")
            }
        }

    fun loadFeed() {
        viewModelScope.launch {
            isLoading = true
            error = null
            val result = postRepository.getFeedPosts()
            result.onSuccess { posts = it }
            result.onFailure { error = it.message }
            isLoading = false
        }
    }

    fun loadUpcomingEvents() {
        viewModelScope.launch {
            eventRepository.getEvents(limit = 4).onSuccess {
                upcomingEvents = it.filter { ev -> ev.status != "trashed" }
            }
        }
    }

    fun loadSceneRadar() {
        viewModelScope.launch {
            try {
                val currentUid = auth.currentUser?.uid ?: ""
                val snap = firestore.collection("users").limit(10).get().await()
                val djs = mutableListOf<UserDto>()
                for (doc in snap.documents) {
                    val user = doc.toObject(UserDto::class.java)?.copy(uid = doc.id)
                    if (user != null && user.uid != currentUid) {
                        djs.add(user)
                    }
                }
                sceneRadarDjs = djs

                // Check existing following
                if (currentUid.isNotBlank()) {
                    val followingSnap = firestore.collection("following")
                        .document(currentUid)
                        .collection("userFollowing")
                        .get()
                        .await()
                    followedDjs = followingSnap.documents.map { it.id }.toSet()
                }
            } catch (e: Exception) {
                // non-critical discovery failure
            }
        }
    }

    fun loadNotifications() {
        viewModelScope.launch {
            isNotificationsLoading = true
            try {
                val currentUid = auth.currentUser?.uid ?: ""
                if (currentUid.isNotBlank()) {
                    val snap = firestore.collection("notifications")
                        .whereEqualTo("targetUid", currentUid)
                        .limit(20)
                        .get()
                        .await()
                    notifications = snap.documents.mapNotNull { d ->
                        d.toObject(NotificationDto::class.java)?.copy(id = d.id)
                    }
                }
            } catch (e: Exception) {
                // non-critical
            } finally {
                isNotificationsLoading = false
            }
        }
    }

    fun toggleFollowDj(djUid: String) {
        val currentUid = auth.currentUser?.uid ?: return
        if (djUid == currentUid) return

        val isNowFollowed = !followedDjs.contains(djUid)
        followedDjs = if (isNowFollowed) followedDjs + djUid else followedDjs - djUid

        viewModelScope.launch {
            try {
                val followingRef = firestore.collection("following")
                    .document(currentUid)
                    .collection("userFollowing")
                    .document(djUid)

                val followerRef = firestore.collection("followers")
                    .document(djUid)
                    .collection("userFollowers")
                    .document(currentUid)

                if (isNowFollowed) {
                    followingRef.set(mapOf("followedAt" to FieldValue.serverTimestamp())).await()
                    followerRef.set(mapOf("followerId" to currentUid)).await()
                } else {
                    followingRef.delete().await()
                    followerRef.delete().await()
                }
            } catch (e: Exception) {
                // Revert on failure
                followedDjs = if (isNowFollowed) followedDjs - djUid else followedDjs + djUid
            }
        }
    }

    fun toggleLike(post: PostDto) {
        val postId = post.id
        if (postId.isEmpty()) return
        val currentlyLiked = post.isLiked
        val newLiked = !currentlyLiked
        val newCount = (post.likesCount + if (newLiked) 1 else -1).coerceAtLeast(0)

        posts = posts.map {
            if (it.id == postId) {
                it.copy(likesCount = newCount).apply { isLiked = newLiked }
            } else it
        }

        viewModelScope.launch {
            val res = if (newLiked) postRepository.likePost(postId) else postRepository.unlikePost(postId)
            if (res.isFailure) {
                posts = posts.map {
                    if (it.id == postId) {
                        it.copy(likesCount = post.likesCount).apply { isLiked = currentlyLiked }
                    } else it
                }
                error = res.exceptionOrNull()?.message ?: "Could not update reaction"
            }
        }
    }

    fun submitPost() {
        if (newPostCaption.isBlank() && newPostMediaUri == null) return
        viewModelScope.launch {
            isPosting = true
            val result = postRepository.createPost(
                caption = newPostCaption,
                mediaUri = newPostMediaUri,
                mediaType = newPostMediaType,
                music = newPostMusic
            )
            result.onSuccess {
                showCreatePostDialog = false
                newPostCaption = ""
                newPostMediaUri = null
                newPostMusic = null
                loadFeed()
            }
            result.onFailure { error = it.message }
            isPosting = false
        }
    }
}
