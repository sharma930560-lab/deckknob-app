package com.deckknob.app.data.repository

import com.deckknob.app.data.model.RegisterRequest
import com.deckknob.app.data.model.UserDto
import com.deckknob.app.data.model.DemoPlaylistDto
import com.deckknob.app.data.model.UsernameCheckResponse
import com.deckknob.app.data.model.UsernameMapping
import com.deckknob.app.data.session.SessionManager
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val auth: FirebaseAuth,
    private val firestore: FirebaseFirestore,
    private val sessionManager: SessionManager,
    private val storageRepository: StorageRepository
) {
    val allSessions = sessionManager.sessions
    val activeUserId = sessionManager.activeUserId
    val firebaseAuth: FirebaseAuth get() = auth
    val currentFirebaseUser: FirebaseUser? get() = auth.currentUser

    suspend fun login(usernameOrEmail: String, password: String): Result<UserDto> {
        return try {
            var email = usernameOrEmail.trim()
            
            // Resolve email if username is provided
            if (!email.contains("@")) {
                val usernameDoc = firestore.collection("usernames").document(email.lowercase()).get().await()
                if (usernameDoc.exists()) {
                    val uid = usernameDoc.toObject(UsernameMapping::class.java)?.uid ?: throw Exception("Username lookup failed")
                    val userDoc = firestore.collection("users").document(uid).get().await()
                    email = userDoc.getString("email") ?: throw Exception("Email not found for user")
                } else {
                    throw Exception("Username not found")
                }
            }

            val result = auth.signInWithEmailAndPassword(email, password).await()
            val user = result.user ?: throw Exception("Login failed: User null")
            val profile = fetchUserProfile(user.uid) ?: throw Exception("Profile not found")
            
            sessionManager.saveSession(profile)
            Result.success(profile)
        } catch (e: Exception) {
            Result.failure(mapFirebaseException(e))
        }
    }

    suspend fun signInWithGoogle(idToken: String): Result<UserDto> {
        return try {
            android.util.Log.d("DeckKnobAuthDiag", "Stage 4: Firebase signInWithCredential() started")
            val credential = GoogleAuthProvider.getCredential(idToken, null)
            val result = auth.signInWithCredential(credential).await()
            val user = result.user
            val hasUser = user != null
            android.util.Log.d("DeckKnobAuthDiag", "Stage 4: Firebase signInWithCredential() completed. User present: $hasUser")
            if (user == null) throw Exception("Google sign in failed: user is null")

            val hasUid = !user.uid.isNullOrBlank()
            android.util.Log.d("DeckKnobAuthDiag", "Stage 5: Firebase authenticated user UID presence: hasUid=$hasUid")

            // Resilient Firestore profile lookup and creation
            var profile: UserDto
            try {
                android.util.Log.d("DeckKnobAuthDiag", "Stage 6: Firestore profile lookup started")
                val userDoc = firestore.collection("users").document(user.uid).get().await()
                val profileExists = userDoc.exists()
                android.util.Log.d("DeckKnobAuthDiag", "Stage 6: Firestore profile lookup completed. Exists: $profileExists")

                if (!profileExists) {
                    android.util.Log.d("DeckKnobAuthDiag", "Stage 7: Profile creation started")
                    var username = (user.email?.split("@")?.getOrNull(0) ?: "dj")
                        .lowercase()
                        .replace(Regex("[^a-z0-9_]"), "")
                    if (username.length < 3) username = "user_${user.uid.take(5)}"

                    var uniqueUsername = username
                    var count = 1
                    try {
                        while (firestore.collection("usernames").document(uniqueUsername).get().await().exists() && count < 10) {
                            uniqueUsername = "${username}_$count"
                            count++
                        }
                    } catch (e: Exception) {
                        android.util.Log.w("DeckKnobAuthDiag", "Username check non-fatal exception: ${e.message}")
                    }

                    profile = UserDto(
                        uid = user.uid,
                        username = uniqueUsername,
                        email = user.email ?: "",
                        profilePic = user.photoUrl?.toString() ?: "",
                        role = "fan"
                    )
                    firestore.collection("users").document(user.uid).set(profile).await()
                    try {
                        firestore.collection("usernames").document(uniqueUsername).set(UsernameMapping(user.uid)).await()
                    } catch (e: Exception) {
                        android.util.Log.w("DeckKnobAuthDiag", "Username mapping write non-fatal exception: ${e.message}")
                    }
                    android.util.Log.d("DeckKnobAuthDiag", "Stage 7: Profile creation completed")
                } else {
                    profile = userDoc.toObject(UserDto::class.java) ?: UserDto(
                        uid = user.uid,
                        username = userDoc.getString("username") ?: "user",
                        email = user.email ?: "",
                        profilePic = userDoc.getString("profile_pic") ?: user.photoUrl?.toString() ?: ""
                    )
                }
            } catch (e: Exception) {
                android.util.Log.w("DeckKnobAuthDiag", "Stage 6/7: Firestore profile recovery fallback triggered: ${e.message}")
                val fallbackUsername = (user.email?.split("@")?.getOrNull(0) ?: "dj")
                    .lowercase()
                    .replace(Regex("[^a-z0-9_]"), "")
                profile = UserDto(
                    uid = user.uid,
                    username = if (fallbackUsername.isNotBlank()) fallbackUsername else "user_${user.uid.take(5)}",
                    email = user.email ?: "",
                    profilePic = user.photoUrl?.toString() ?: "",
                    role = "fan"
                )
            }

            sessionManager.saveSession(profile)
            android.util.Log.d("DeckKnobAuthDiag", "Stage 8: Session persistence completed")
            Result.success(profile)
        } catch (e: Exception) {
            android.util.Log.e("DeckKnobAuthDiag", "Stage 11: AuthRepository caught exception in signInWithGoogle: ${e::class.java.simpleName}, message=${e.message}")
            Result.failure(mapFirebaseException(e))
        }
    }

    suspend fun register(request: RegisterRequest): Result<UserDto> {
        return register(request.username, request.email, request.password, request.role)
    }

    suspend fun register(username: String, email: String, password: String, role: String): Result<UserDto> {
        return try {
            // 1. Check username availability
            val usernameRef = firestore.collection("usernames").document(username.lowercase().trim()).get().await()
            if (usernameRef.exists()) throw Exception("Username already taken")

            // 2. Create Auth User
            val result = auth.createUserWithEmailAndPassword(email.trim(), password).await()
            val user = result.user ?: throw Exception("Registration failed: User null")

            // 3. Create Firestore Profile
            val profile = UserDto(
                uid = user.uid,
                username = username.trim(),
                email = email.trim(),
                role = role
            )
            firestore.collection("users").document(user.uid).set(profile).await()
            firestore.collection("usernames").document(username.lowercase().trim()).set(UsernameMapping(user.uid)).await()

            sessionManager.saveSession(profile)
            Result.success(profile)
        } catch (e: Exception) {
            Result.failure(mapFirebaseException(e))
        }
    }

    suspend fun checkUsername(username: String): Result<UsernameCheckResponse> {
        if (username.length < 3) return Result.success(UsernameCheckResponse(available = false))
        return try {
            val doc = firestore.collection("usernames").document(username.lowercase().trim()).get().await()
            val available = !doc.exists()
            val suggestions = if (!available) {
                listOf("${username}1", "${username}_dj", "${username}official")
            } else {
                emptyList()
            }
            Result.success(UsernameCheckResponse(available = available, suggestions = suggestions))
        } catch (e: Exception) {
            Result.failure(mapFirebaseException(e))
        }
    }

    suspend fun fetchUserProfile(uid: String): UserDto? {
        return try {
            val doc = firestore.collection("users").document(uid).get().await()
            if (!doc.exists()) return null
            val user = doc.toObject(UserDto::class.java)
            if (user != null) {
                val profilePic = doc.getString("profilePic") ?: doc.getString("profile_pic") ?: user.profilePic
                val coverPhoto = doc.getString("coverPhoto") ?: doc.getString("cover_photo") ?: user.coverPhoto
                val name = doc.getString("name") ?: doc.getString("displayName") ?: user.name
                user.copy(
                    profilePic = profilePic,
                    coverPhoto = coverPhoto,
                    name = name
                )
            } else {
                null
            }
        } catch (e: Exception) {
            null
        }
    }

    suspend fun logout() {
        val activeId = sessionManager.activeUserId.first()
        if (activeId != null) {
            sessionManager.logout(activeId)
        }
        auth.signOut()
    }

    suspend fun switchAccount(uid: String) {
        sessionManager.switchAccount(uid)
    }

    suspend fun updateUserProfile(
        city: String = "",
        genre: String = "",
        bio: String = "",
        profilePicUri: android.net.Uri? = null,
        name: String? = null,
        coverPhotoUri: android.net.Uri? = null,
        website: String? = null,
        instagram: String? = null,
        soundcloud: String? = null,
        youtube: String? = null,
        role: String? = null,
        isPrivate: Boolean? = null,
        hideLikes: Boolean? = null
    ): Result<UserDto> {
        return try {
            val user = auth.currentUser ?: throw Exception("User not authenticated")
            val uid = user.uid

            val updates = mutableMapOf<String, Any>()
            if (city.isNotEmpty()) updates["city"] = city
            if (genre.isNotEmpty()) updates["genre"] = genre
            if (bio.isNotEmpty()) updates["bio"] = bio
            if (name != null) {
                updates["name"] = name
                updates["displayName"] = name
            }
            if (website != null) updates["website"] = website
            if (instagram != null) updates["instagram"] = instagram
            if (soundcloud != null) updates["soundcloud"] = soundcloud
            if (youtube != null) updates["youtube"] = youtube
            if (role != null) updates["role"] = role
            if (isPrivate != null) {
                updates["is_private"] = isPrivate
                updates["isPrivate"] = isPrivate
            }
            if (hideLikes != null) {
                updates["hide_likes"] = hideLikes
                updates["hideLikes"] = hideLikes
            }

            if (profilePicUri != null) {
                try {
                    val avatarUrl = storageRepository.uploadFile(profilePicUri, "users/$uid", "avatar").getOrThrow()
                    updates["profile_pic"] = avatarUrl
                    updates["profilePic"] = avatarUrl
                } catch (e: Exception) {
                    android.util.Log.w("AuthRepository", "Avatar upload skipped or failed: ${e.message}")
                }
            }
            if (coverPhotoUri != null) {
                try {
                    val coverUrl = storageRepository.uploadFile(coverPhotoUri, "users/$uid", "cover").getOrThrow()
                    updates["cover_photo"] = coverUrl
                    updates["coverPhoto"] = coverUrl
                } catch (e: Exception) {
                    android.util.Log.w("AuthRepository", "Cover photo upload skipped or failed: ${e.message}")
                }
            }

            if (updates.isNotEmpty()) {
                firestore.collection("users").document(uid).set(updates, SetOptions.merge()).await()
            }
            val updatedUser = fetchUserProfile(uid) ?: throw Exception("Failed to fetch updated profile")
            sessionManager.saveSession(updatedUser)
            Result.success(updatedUser)
        } catch (e: Exception) {
            Result.failure(mapFirebaseException(e))
        }
    }

    suspend fun submitProblemReport(
        category: String,
        description: String,
        contactEmail: String
    ): Result<Boolean> {
        return try {
            val uid = auth.currentUser?.uid ?: "anonymous"
            val reportData = mapOf(
                "userId" to uid,
                "category" to category,
                "description" to description,
                "contactEmail" to contactEmail,
                "platform" to "Android",
                "timestamp" to com.google.firebase.Timestamp.now()
            )
            firestore.collection("reports").add(reportData).await()
            Result.success(true)
        } catch (e: Exception) {
            Result.failure(mapFirebaseException(e))
        }
    }

    suspend fun updateDemoPlaylists(playlists: List<DemoPlaylistDto>): Result<Unit> {
        return try {
            val user = auth.currentUser ?: throw Exception("User not authenticated")
            val uid = user.uid
            firestore.collection("users").document(uid)
                .update("demoPlaylists", playlists)
                .await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(mapFirebaseException(e))
        }
    }

    private fun mapFirebaseException(e: Throwable): Exception {
        val message = e.message ?: ""
        return when {
            e is com.google.firebase.auth.FirebaseAuthUserCollisionException ->
                Exception("An account with this email already exists.")
            e is com.google.firebase.auth.FirebaseAuthWeakPasswordException ->
                Exception("Password is too weak. Please use at least 6 characters.")
            e is com.google.firebase.auth.FirebaseAuthInvalidCredentialsException ->
                Exception("Invalid email format or password.")
            message.contains("client is offline", ignoreCase = true) ||
            message.contains("UNAVAILABLE", ignoreCase = true) ||
            message.contains("Unable to resolve host", ignoreCase = true) ->
                Exception("Connection problem. Please check your internet connection and try again.")
            message.contains("PERMISSION_DENIED", ignoreCase = true) ->
                Exception("Access denied. Please check your account permissions.")
            message.contains("Object does not exist", ignoreCase = true) || message.contains("-13010", ignoreCase = true) ->
                Exception("Selected media file could not be uploaded. Please try picking a different photo.")
            else -> Exception(e.localizedMessage ?: "An unexpected error occurred. Please try again.")
        }
    }
}
