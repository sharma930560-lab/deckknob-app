package com.deckknob.app.ui.profile

import kotlinx.coroutines.tasks.await

import android.net.Uri
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.deckknob.app.data.model.CalendarAccessResult
import com.deckknob.app.data.model.DJCalendarEntry
import com.deckknob.app.data.model.DJCalendarSettings
import com.deckknob.app.data.repository.DJCalendarRepository
import com.deckknob.app.data.model.DemoPlaylistDto
import com.deckknob.app.data.model.DemoTrackDto
import com.deckknob.app.data.repository.StorageRepository
import com.deckknob.app.data.model.PostDto
import com.deckknob.app.data.model.ReelDto
import com.deckknob.app.data.model.UserDto
import com.deckknob.app.data.repository.AuthRepository
import com.deckknob.app.data.repository.PostRepository
import com.deckknob.app.data.repository.ReelRepository
import com.deckknob.app.data.repository.SocialRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val postRepository: PostRepository,
    private val reelRepository: ReelRepository,
    private val storageRepository: StorageRepository,
    private val djCalendarRepository: DJCalendarRepository,
    private val socialRepository: SocialRepository
) : ViewModel() {

    var currentUser by mutableStateOf<UserDto?>(null)
    var isLoading by mutableStateOf(false)
    var error by mutableStateOf<String?>(null)
    var successMessage by mutableStateOf<String?>(null)

    var userPosts by mutableStateOf<List<PostDto>>(emptyList())
    var userKlyps by mutableStateOf<List<ReelDto>>(emptyList())
    var demoPlaylists by mutableStateOf<List<DemoPlaylistDto>>(emptyList())
    var selectedTab by mutableIntStateOf(0)
    var isOtherUser by mutableStateOf(false)
    var isFollowingUser by mutableStateOf(false)

    // DJ Calendar State
    var calendarAccessResult by mutableStateOf<CalendarAccessResult>(CalendarAccessResult.Loading)
    var calendarSettings by mutableStateOf(DJCalendarSettings(privacy = "private"))
    var showCalendarPrivacyDialog by mutableStateOf(false)
    var showAddCalendarEntryDialog by mutableStateOf(false)
    var editingCalendarEntry by mutableStateOf<DJCalendarEntry?>(null)
    var deletingCalendarEntryId by mutableStateOf<String?>(null)
    var isSavingCalendarEntry by mutableStateOf(false)

    var calEntryTitle by mutableStateOf("")
    var calEntryDate by mutableStateOf("")
    var calEntryStartTime by mutableStateOf("22:00")
    var calEntryEndTime by mutableStateOf("04:00")
    var calEntryVenue by mutableStateOf("")
    var calEntryCity by mutableStateOf("")
    var calEntryType by mutableStateOf("gig")
    var calEntryNotes by mutableStateOf("")
    var calEntryVisibility by mutableStateOf("followers")

    var showUploadDemoDialog by mutableStateOf(false)
    var newDemoTitle by mutableStateOf("")
    var newDemoBpm by mutableStateOf("")
    var newDemoKey by mutableStateOf("")
    var newDemoAudioUri by mutableStateOf<Uri?>(null)
    var newDemoFileName by mutableStateOf("")
    var newDemoFileSizeMb by mutableStateOf("")
    var isUploadingDemo by mutableStateOf(false)
    var activePlayingTrackUrl by mutableStateOf<String?>(null)

    // Follow List Sheet State (Feature C)
    var showFollowListSheet by mutableStateOf(false)
    var followListTitle by mutableStateOf("Followers")
    var followListUsers by mutableStateOf<List<UserDto>>(emptyList())
    var isLoadingFollowList by mutableStateOf(false)
    var followListError by mutableStateOf<String?>(null)
    val followListFollowingMap = androidx.compose.runtime.mutableStateMapOf<String, Boolean>()
    var activeViewerUid by mutableStateOf<String?>(null)

    // Saved Vault State (Tab 2)
    var savedPosts by mutableStateOf<List<PostDto>>(emptyList())
    var savedKlyps by mutableStateOf<List<ReelDto>>(emptyList())
    var isLoadingSaved by mutableStateOf(false)

    // Avatar Cropping State (Bug 01)
    var rawPickedAvatarUri by mutableStateOf<Uri?>(null)
    var showAvatarCropDialog by mutableStateOf(false)

    var showEditProfileDialog by mutableStateOf(false)
    var showAvatarViewer by mutableStateOf(false)
    var showCoverViewer by mutableStateOf(false)

    var editName by mutableStateOf("")
    var editCity by mutableStateOf("")
    var editGenre by mutableStateOf("")
    var editBio by mutableStateOf("")
    var editRole by mutableStateOf("dj")
    var editWebsite by mutableStateOf("")
    var editInstagram by mutableStateOf("")
    var editSoundcloud by mutableStateOf("")
    var editYoutube by mutableStateOf("")
    var editAvatarUri by mutableStateOf<Uri?>(null)
    var editCoverUri by mutableStateOf<Uri?>(null)
    var isSaving by mutableStateOf(false)

    init {
        loadProfile()
        observeSocialSync()
    }

    private fun observeSocialSync() {
        viewModelScope.launch {
            socialRepository.followingState.collect { stateMap ->
                val target = currentUser?.uid
                if (target != null && stateMap.containsKey(target) && isOtherUser) {
                    isFollowingUser = stateMap[target] ?: false
                }
                stateMap.forEach { (uid, isFollowing) ->
                    followListFollowingMap[uid] = isFollowing
                }
            }
        }
    }

    fun loadProfile() {
        loadUserProfile(null)
    }

    fun loadUserProfile(targetUid: String?) {
        viewModelScope.launch {
            isLoading = true
            error = null
            val activeUid = authRepository.activeUserId.firstOrNull() ?: authRepository.currentFirebaseUser?.uid
            activeViewerUid = activeUid
            val uidToLoad = if (!targetUid.isNullOrBlank()) targetUid else activeUid
            isOtherUser = !targetUid.isNullOrBlank() && targetUid != activeUid

            if (uidToLoad != null) {
                val profile = authRepository.fetchUserProfile(uidToLoad)
                currentUser = profile
                if (!isOtherUser && profile != null) {
                    populateEditFields(profile)
                }

                demoPlaylists = profile?.demoPlaylists ?: emptyList()
                postRepository.getUserPosts(uidToLoad).onSuccess { userPosts = it }
                reelRepository.getUserReels(uidToLoad).onSuccess { userKlyps = it }
                loadCalendar(uidToLoad)
                if (!isOtherUser) {
                    loadSavedVault()
                }

                if (isOtherUser && activeUid != null) {
                    isFollowingUser = djCalendarRepository.isFollowing(activeUid, uidToLoad)
                }

                // Authoritative Live Count Hydration from follow graph
                launch {
                    val liveFollowers = socialRepository.getFollowerCount(uidToLoad)
                    val liveFollowing = socialRepository.getFollowingCount(uidToLoad)
                    val currentProf = currentUser
                    if (currentProf != null && currentProf.uid == uidToLoad) {
                        val finalFollowers = if (liveFollowers > 0 || currentProf.followersCount == 0) liveFollowers else currentProf.followersCount
                        val finalFollowing = if (liveFollowing > 0 || currentProf.followingCount == 0) liveFollowing else currentProf.followingCount
                        currentUser = currentProf.copy(
                            followersCount = finalFollowers,
                            followingCount = finalFollowing
                        )
                    }
                }
            }
            isLoading = false
        }
    }

    fun toggleFollow() {
        viewModelScope.launch {
            val targetUid = currentUser?.uid ?: return@launch
            val activeUid = authRepository.activeUserId.firstOrNull() ?: authRepository.currentFirebaseUser?.uid ?: return@launch
            if (targetUid == activeUid) return@launch

            val wasFollowing = isFollowingUser
            val previousFollowersCount = currentUser?.followersCount ?: 0

            // Optimistic update
            isFollowingUser = !wasFollowing
            val newCount = if (!wasFollowing) previousFollowersCount + 1 else (previousFollowersCount - 1).coerceAtLeast(0)
            currentUser = currentUser?.copy(followersCount = newCount)

            val result = if (!wasFollowing) {
                val currentProfile = authRepository.fetchUserProfile(activeUid)
                socialRepository.followUser(activeUid, targetUid, currentProfile)
            } else {
                socialRepository.unfollowUser(activeUid, targetUid)
            }

            result.fold(
                onSuccess = {
                    loadCalendar(targetUid)
                },
                onFailure = {
                    // Revert optimistic updates
                    isFollowingUser = wasFollowing
                    currentUser = currentUser?.copy(followersCount = previousFollowersCount)
                    error = "Failed to update follow status"
                }
            )
        }
    }

    fun openFollowersList() {
        val targetUid = currentUser?.uid ?: return
        followListTitle = "Followers"
        showFollowListSheet = true
        loadFollowList(targetUid, isFollowers = true)
    }

    fun openFollowingList() {
        val targetUid = currentUser?.uid ?: return
        followListTitle = "Following"
        showFollowListSheet = true
        loadFollowList(targetUid, isFollowers = false)
    }

    private fun loadFollowList(targetUid: String, isFollowers: Boolean) {
        viewModelScope.launch {
            isLoadingFollowList = true
            followListError = null
            val result = if (isFollowers) {
                socialRepository.getFollowers(targetUid)
            } else {
                socialRepository.getFollowing(targetUid)
            }

            result.fold(
                onSuccess = { users ->
                    followListUsers = users
                    isLoadingFollowList = false
                    if (currentUser?.uid == targetUid) {
                        currentUser = if (isFollowers) {
                            currentUser?.copy(followersCount = users.size)
                        } else {
                            currentUser?.copy(followingCount = users.size)
                        }
                    }
                    val viewer = activeViewerUid
                    if (viewer != null) {
                        for (u in users) {
                            val isF = socialRepository.isFollowing(viewer, u.uid)
                            followListFollowingMap[u.uid] = isF
                        }
                    }
                },
                onFailure = { e ->
                    followListError = "Unable to load users."
                    isLoadingFollowList = false
                }
            )
        }
    }

    fun toggleFollowInSheet(targetUser: UserDto) {
        val viewer = activeViewerUid ?: return
        val targetUid = targetUser.uid
        if (targetUid.isBlank() || targetUid == viewer) return

        val isCurrentlyFollowing = followListFollowingMap[targetUid] ?: false
        followListFollowingMap[targetUid] = !isCurrentlyFollowing

        viewModelScope.launch {
            val res = if (isCurrentlyFollowing) {
                socialRepository.unfollowUser(viewer, targetUid)
            } else {
                val currentProfile = authRepository.fetchUserProfile(viewer)
                socialRepository.followUser(viewer, targetUid, currentProfile)
            }
            res.onFailure {
                followListFollowingMap[targetUid] = isCurrentlyFollowing
            }
        }
    }

    private fun populateEditFields(profile: UserDto) {
        editName = profile.name.ifEmpty { profile.username }
        editCity = profile.city
        editGenre = profile.genre
        editBio = profile.bio
        editRole = profile.role
        editWebsite = profile.website
        editInstagram = profile.instagram
        editSoundcloud = profile.soundcloud
        editYoutube = profile.youtube
    }

    fun openEditProfile() {
        currentUser?.let { populateEditFields(it) }
        editAvatarUri = null
        editCoverUri = null
        showEditProfileDialog = true
    }

    fun saveProfile() {
        viewModelScope.launch {
            isSaving = true
            error = null
            val result = authRepository.updateUserProfile(
                city = editCity.trim(),
                genre = editGenre.trim(),
                bio = editBio.trim(),
                profilePicUri = editAvatarUri,
                name = editName.trim(),
                coverPhotoUri = editCoverUri,
                website = editWebsite.trim(),
                instagram = editInstagram.trim(),
                soundcloud = editSoundcloud.trim(),
                youtube = editYoutube.trim(),
                role = editRole.trim()
            )
            result.onSuccess {
                currentUser = it
                showEditProfileDialog = false
                editAvatarUri = null
                editCoverUri = null
                successMessage = "Profile updated successfully!"
            }
            result.onFailure {
                error = it.localizedMessage ?: "Failed to save profile"
            }
            isSaving = false
        }
    }
    fun setAudioDemoUri(uri: Uri?) {
        newDemoAudioUri = uri
        if (uri != null) {
            val fileInfo = storageRepository.getMediaFileInfo(uri, isAudioHint = true)
            newDemoFileName = fileInfo.displayName
            val sizeMb = if (fileInfo.sizeBytes > 0) String.format(java.util.Locale.US, "%.1f MB", fileInfo.sizeBytes.toDouble() / (1024 * 1024)) else ""
            newDemoFileSizeMb = sizeMb

            if (fileInfo.sizeBytes > StorageRepository.MAX_AUDIO_SIZE_BYTES) {
                error = "Audio file exceeds 25MB limit ($sizeMb)"
            }

            if (newDemoTitle.isBlank()) {
                val cleaned = fileInfo.displayName.substringBeforeLast('.')
                if (cleaned.isNotBlank()) newDemoTitle = cleaned
            }
        } else {
            newDemoFileName = ""
            newDemoFileSizeMb = ""
        }
    }

    fun loadSavedVault() {
        viewModelScope.launch {
            isLoadingSaved = true
            try {
                val uid = authRepository.activeUserId.firstOrNull() ?: authRepository.currentFirebaseUser?.uid
                if (uid.isNullOrBlank()) {
                    savedPosts = emptyList()
                    savedKlyps = emptyList()
                    isLoadingSaved = false
                    return@launch
                }
                val firestore = com.google.firebase.firestore.FirebaseFirestore.getInstance()
                val snap = firestore.collection("savedPosts")
                    .whereEqualTo("userId", uid)
                    .get()
                    .await()

                val savedPostIds = snap.documents.mapNotNull { it.getString("postId") }
                if (savedPostIds.isNotEmpty()) {
                    val foundPosts = mutableListOf<PostDto>()
                    val foundReels = mutableListOf<ReelDto>()

                    for (id in savedPostIds) {
                        try {
                            val postDoc = firestore.collection("posts").document(id).get().await()
                            if (postDoc.exists()) {
                                postDoc.toObject(PostDto::class.java)?.copy(id = postDoc.id)?.let { p ->
                                    p.isBookmarked = true
                                    foundPosts.add(p)
                                }
                            } else {
                                val reelDoc = firestore.collection("reels").document(id).get().await()
                                if (reelDoc.exists()) {
                                    reelDoc.toObject(ReelDto::class.java)?.copy(id = reelDoc.id)?.let { r ->
                                        r.isBookmarked = true
                                        foundReels.add(r)
                                    }
                                }
                            }
                        } catch (_: Exception) {}
                    }
                    savedPosts = foundPosts
                    savedKlyps = foundReels
                } else {
                    savedPosts = emptyList()
                    savedKlyps = emptyList()
                }
            } catch (e: Exception) {
                com.deckknob.app.util.DeckKnobLogger.w(com.deckknob.app.util.DeckKnobLogger.Tag.FIRESTORE, "loadSavedVault error: ${e.message}")
            } finally {
                isLoadingSaved = false
            }
        }
    }

    fun uploadDemoTrack() {
        val uri = newDemoAudioUri ?: return
        if (newDemoTitle.isBlank()) return
        val uid = authRepository.currentFirebaseUser?.uid ?: return

        val fileInfo = storageRepository.getMediaFileInfo(uri, isAudioHint = true)
        if (fileInfo.sizeBytes > StorageRepository.MAX_AUDIO_SIZE_BYTES) {
            val sizeMb = String.format(java.util.Locale.US, "%.1f MB", fileInfo.sizeBytes.toDouble() / (1024 * 1024))
            error = "Cannot upload: audio file ($sizeMb) exceeds 25MB limit"
            return
        }

        viewModelScope.launch {
            isUploadingDemo = true
            error = null
            try {
                val uploadResult = storageRepository.uploadFile(uri, "demos/$uid", "demo")
                val downloadUrl = uploadResult.getOrThrow()

                val newTrack = DemoTrackDto(
                    id = "trk_${System.currentTimeMillis()}",
                    title = newDemoTitle.trim(),
                    audioUrl = downloadUrl,
                    bpm = newDemoBpm.toIntOrNull(),
                    key = newDemoKey.trim().ifEmpty { null }
                )

                val currentLists = demoPlaylists.toMutableList()
                if (currentLists.isEmpty()) {
                    currentLists.add(
                        DemoPlaylistDto(
                            id = "pl_default_$uid",
                            title = "Underground Club Demos",
                            description = "Unreleased DJ tracks & stems",
                            visibility = "public",
                            ownershipAttested = true,
                            tracks = listOf(newTrack),
                            createdAt = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(java.util.Date())
                        )
                    )
                } else {
                    val first = currentLists[0]
                    currentLists[0] = first.copy(tracks = first.tracks + newTrack)
                }

                val updateRes = authRepository.updateDemoPlaylists(currentLists)
                if (updateRes.isSuccess) {
                    demoPlaylists = currentLists
                    showUploadDemoDialog = false
                    newDemoTitle = ""
                    newDemoBpm = ""
                    newDemoKey = ""
                    newDemoAudioUri = null
                    newDemoFileName = ""
                    newDemoFileSizeMb = ""
                    successMessage = "Demo track published to DJ Sets!"
                } else {
                    error = updateRes.exceptionOrNull()?.message ?: "Could not save demo playlist"
                }
            } catch (e: Exception) {
                error = e.localizedMessage ?: "Failed to upload demo audio"
            }
            isUploadingDemo = false
        }
    }

    fun loadCalendar(targetDjUid: String? = null) {
        viewModelScope.launch {
            calendarAccessResult = CalendarAccessResult.Loading
            val callerUid = authRepository.activeUserId.firstOrNull() ?: authRepository.currentFirebaseUser?.uid ?: ""
            val djUid = targetDjUid ?: callerUid
            if (djUid.isBlank()) return@launch

            calendarSettings = djCalendarRepository.getCalendarSettings(djUid)
            calendarAccessResult = djCalendarRepository.getCalendarEntries(djUid, callerUid)
        }
    }

    fun updateCalendarPrivacy(newPrivacy: String) {
        viewModelScope.launch {
            val callerUid = authRepository.activeUserId.firstOrNull() ?: authRepository.currentFirebaseUser?.uid ?: return@launch
            val res = djCalendarRepository.updateCalendarSettings(callerUid, newPrivacy, callerUid)
            res.onSuccess {
                calendarSettings = calendarSettings.copy(privacy = newPrivacy)
                showCalendarPrivacyDialog = false
                successMessage = "Calendar privacy updated: $newPrivacy"
                loadCalendar(callerUid)
            }.onFailure {
                error = it.localizedMessage ?: "Failed to update calendar privacy"
            }
        }
    }

    fun openAddCalendarEntry() {
        editingCalendarEntry = null
        calEntryTitle = ""
        val df = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US)
        calEntryDate = df.format(java.util.Date())
        calEntryStartTime = "22:00"
        calEntryEndTime = "04:00"
        calEntryVenue = ""
        calEntryCity = currentUser?.city ?: ""
        calEntryType = "gig"
        calEntryNotes = ""
        calEntryVisibility = "followers"
        showAddCalendarEntryDialog = true
    }

    fun openEditCalendarEntry(entry: DJCalendarEntry) {
        editingCalendarEntry = entry
        calEntryTitle = entry.title
        calEntryDate = entry.date
        calEntryStartTime = entry.startTime
        calEntryEndTime = entry.endTime
        calEntryVenue = entry.venue
        calEntryCity = entry.city
        calEntryType = entry.entryType
        calEntryNotes = entry.notes
        calEntryVisibility = entry.visibility
        showAddCalendarEntryDialog = true
    }

    fun saveCalendarEntry() {
        if (calEntryTitle.isBlank() || calEntryDate.isBlank()) {
            error = "Title and date are required"
            return
        }

        viewModelScope.launch {
            val callerUid = authRepository.activeUserId.firstOrNull() ?: authRepository.currentFirebaseUser?.uid ?: return@launch
            isSavingCalendarEntry = true
            val entryToSave = DJCalendarEntry(
                id = editingCalendarEntry?.id ?: "",
                djUid = callerUid,
                title = calEntryTitle.trim(),
                entryType = calEntryType,
                date = calEntryDate.trim(),
                startTime = calEntryStartTime.trim(),
                endTime = calEntryEndTime.trim(),
                venue = calEntryVenue.trim(),
                city = calEntryCity.trim(),
                notes = calEntryNotes.trim(),
                visibility = calEntryVisibility
            )

            val result = if (editingCalendarEntry != null) {
                djCalendarRepository.updateCalendarEntry(entryToSave, callerUid)
            } else {
                djCalendarRepository.addCalendarEntry(entryToSave, callerUid)
            }

            result.onSuccess {
                showAddCalendarEntryDialog = false
                editingCalendarEntry = null
                successMessage = "Calendar entry saved!"
                loadCalendar(callerUid)
            }.onFailure {
                error = it.localizedMessage ?: "Failed to save calendar entry"
            }
            isSavingCalendarEntry = false
        }
    }

    fun deleteCalendarEntry(entryId: String) {
        viewModelScope.launch {
            val callerUid = authRepository.activeUserId.firstOrNull() ?: authRepository.currentFirebaseUser?.uid ?: return@launch
            val result = djCalendarRepository.deleteCalendarEntry(callerUid, entryId, callerUid)
            result.onSuccess {
                deletingCalendarEntryId = null
                successMessage = "Entry removed from schedule"
                loadCalendar(callerUid)
            }.onFailure {
                error = it.localizedMessage ?: "Failed to delete entry"
            }
        }
    }
}
