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
import com.deckknob.app.data.repository.AuthRepository
import com.deckknob.app.data.repository.EventRepository
import com.deckknob.app.data.repository.PostRepository
import com.deckknob.app.data.repository.SocialRepository
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
    private val auth: FirebaseAuth,
    private val socialRepository: SocialRepository,
    private val authRepository: AuthRepository
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

    // Comments State for Feed Posts
    var activeCommentPostId by mutableStateOf<String?>(null)
    var comments by mutableStateOf<List<com.deckknob.app.data.model.ReelCommentDto>>(emptyList())
    var isLoadingComments by mutableStateOf(false)
    var isSubmittingComment by mutableStateOf(false)
    var newCommentText by mutableStateOf("")

    init {
        loadFeed()
        loadUpcomingEvents()
        loadSceneRadar()
        loadNotifications()
        observeSocialSync()
    }

    private fun observeSocialSync() {
        viewModelScope.launch {
            socialRepository.followingState.collect { stateMap ->
                val current = followedDjs.toMutableSet()
                stateMap.forEach { (targetUid, isFollowing) ->
                    if (isFollowing) current.add(targetUid) else current.remove(targetUid)
                }
                followedDjs = current
            }
        }
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

                // Load existing following via SocialRepository for unified state
                if (currentUid.isNotBlank()) {
                    val followingRes = socialRepository.getFollowing(currentUid)
                    val followingUids = followingRes.getOrDefault(emptyList()).map { it.uid }.toSet()
                    followedDjs = followingUids
                    socialRepository.seedFollowingState(followingUids)
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
        if (djUid.isBlank() || djUid == currentUid) return

        val isNowFollowed = !followedDjs.contains(djUid)
        // Optimistic UI update
        followedDjs = if (isNowFollowed) followedDjs + djUid else followedDjs - djUid

        viewModelScope.launch {
            val result = if (isNowFollowed) {
                val currentUserProfile = authRepository.fetchUserProfile(currentUid)
                socialRepository.followUser(currentUid, djUid, currentUserProfile)
            } else {
                socialRepository.unfollowUser(currentUid, djUid)
            }

            result.onFailure {
                // Revert on failure
                followedDjs = if (isNowFollowed) followedDjs - djUid else followedDjs + djUid
                error = "Could not update relationship. Please try again."
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

    fun toggleBookmark(post: PostDto) {
        val postId = post.id
        if (postId.isEmpty()) return
        val currentlyBookmarked = post.isBookmarked
        val newBookmarked = !currentlyBookmarked

        posts = posts.map {
            if (it.id == postId) {
                it.copy().apply { isBookmarked = newBookmarked; isLiked = it.isLiked }
            } else it
        }

        viewModelScope.launch {
            val res = postRepository.bookmarkPost(postId, newBookmarked)
            if (res.isFailure) {
                posts = posts.map {
                    if (it.id == postId) {
                        it.copy().apply { isBookmarked = currentlyBookmarked; isLiked = it.isLiked }
                    } else it
                }
                error = res.exceptionOrNull()?.message ?: "Could not update bookmark"
            }
        }
    }

    fun openComments(postId: String) {
        activeCommentPostId = postId
        newCommentText = ""
        viewModelScope.launch {
            isLoadingComments = true
            val res = postRepository.getComments(postId)
            res.onSuccess { comments = it }
            res.onFailure { error = it.message }
            isLoadingComments = false
        }
    }

    fun closeComments() {
        activeCommentPostId = null
        comments = emptyList()
        newCommentText = ""
    }

    fun addComment(postId: String, text: String) {
        if (text.trim().isEmpty() || isSubmittingComment) return
        viewModelScope.launch {
            isSubmittingComment = true
            val res = postRepository.addComment(postId, text)
            res.onSuccess { newComment ->
                comments = comments + newComment
                newCommentText = ""
                posts = posts.map {
                    if (it.id == postId) it.copy(commentsCount = it.commentsCount + 1).apply { isLiked = it.isLiked; isBookmarked = it.isBookmarked } else it
                }
            }
            res.onFailure { error = it.message }
            isSubmittingComment = false
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
