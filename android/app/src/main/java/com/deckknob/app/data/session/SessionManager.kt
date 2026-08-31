package com.deckknob.app.data.session

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.deckknob.app.data.model.AuthResponse
import com.deckknob.app.data.model.UserDto
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore by preferencesDataStore(name = "sessions")

@Singleton
class SessionManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val gson: Gson
) {
    private val SESSIONS_KEY = stringPreferencesKey("user_sessions")
    private val ACTIVE_USER_ID_KEY = stringPreferencesKey("active_user_id")

    val sessions: Flow<List<UserSession>> = context.dataStore.data.map { prefs ->
        val json = prefs[SESSIONS_KEY] ?: "[]"
        val type = object : TypeToken<List<UserSession>>() {}.type
        gson.fromJson(json, type)
    }

    val activeSession: Flow<UserSession?> = context.dataStore.data.map { prefs ->
        val json = prefs[SESSIONS_KEY] ?: "[]"
        val activeId = prefs[ACTIVE_USER_ID_KEY]
        val type = object : TypeToken<List<UserSession>>() {}.type
        val list: List<UserSession> = gson.fromJson(json, type)
        list.find { it.user.id.toString() == activeId } ?: list.firstOrNull()
    }

    suspend fun saveSession(authResponse: AuthResponse) {
        context.dataStore.edit { prefs ->
            val json = prefs[SESSIONS_KEY] ?: "[]"
            val type = object : TypeToken<MutableList<UserSession>>() {}.type
            val list: MutableList<UserSession> = gson.fromJson(json, type)

            // Remove if exists
            list.removeAll { it.user.id == authResponse.user.id }
            
            // Add new
            list.add(UserSession(authResponse.user, authResponse.access, authResponse.refresh))
            
            prefs[SESSIONS_KEY] = gson.toJson(list)
            prefs[ACTIVE_USER_ID_KEY] = authResponse.user.id.toString()
        }
    }

    suspend fun switchAccount(userId: Int) {
        context.dataStore.edit { prefs ->
            prefs[ACTIVE_USER_ID_KEY] = userId.toString()
        }
    }

    suspend fun logout(userId: Int) {
        context.dataStore.edit { prefs ->
            val json = prefs[SESSIONS_KEY] ?: "[]"
            val type = object : TypeToken<MutableList<UserSession>>() {}.type
            val list: MutableList<UserSession> = gson.fromJson(json, type)
            
            list.removeAll { it.user.id == userId }
            prefs[SESSIONS_KEY] = gson.toJson(list)
            
            if (prefs[ACTIVE_USER_ID_KEY] == userId.toString()) {
                prefs[ACTIVE_USER_ID_KEY] = list.firstOrNull()?.user?.id?.toString() ?: ""
            }
        }
    }

    suspend fun clearAll() {
        context.dataStore.edit { it.clear() }
    }
}

data class UserSession(
    val user: UserDto,
    val accessToken: String,
    val refreshToken: String
)
