package com.deckknob.app.data.session

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
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

    val sessions: Flow<List<UserDto>> = context.dataStore.data.map { prefs ->
        val json = prefs[SESSIONS_KEY] ?: "[]"
        val type = object : TypeToken<List<UserDto>>() {}.type
        gson.fromJson(json, type)
    }

    val activeUserId: Flow<String?> = context.dataStore.data.map { prefs ->
        prefs[ACTIVE_USER_ID_KEY]
    }

    val activeSession: Flow<UserDto?> = context.dataStore.data.map { prefs ->
        val activeUid = prefs[ACTIVE_USER_ID_KEY] ?: return@map null
        val json = prefs[SESSIONS_KEY] ?: "[]"
        val type = object : TypeToken<List<UserDto>>() {}.type
        val list: List<UserDto> = gson.fromJson(json, type)
        list.firstOrNull { it.uid == activeUid }
    }

    suspend fun saveSession(user: UserDto) {
        context.dataStore.edit { prefs ->
            val json = prefs[SESSIONS_KEY] ?: "[]"
            val type = object : TypeToken<MutableList<UserDto>>() {}.type
            val list: MutableList<UserDto> = gson.fromJson(json, type)

            list.removeAll { it.uid == user.uid }
            list.add(user)
            
            prefs[SESSIONS_KEY] = gson.toJson(list)
            prefs[ACTIVE_USER_ID_KEY] = user.uid
        }
    }

    suspend fun switchAccount(uid: String) {
        context.dataStore.edit { prefs ->
            prefs[ACTIVE_USER_ID_KEY] = uid
        }
    }

    suspend fun logout(uid: String) {
        context.dataStore.edit { prefs ->
            val json = prefs[SESSIONS_KEY] ?: "[]"
            val type = object : TypeToken<MutableList<UserDto>>() {}.type
            val list: MutableList<UserDto> = gson.fromJson(json, type)
            
            list.removeAll { it.uid == uid }
            prefs[SESSIONS_KEY] = gson.toJson(list)
            
            if (prefs[ACTIVE_USER_ID_KEY] == uid) {
                prefs[ACTIVE_USER_ID_KEY] = list.firstOrNull()?.uid ?: ""
            }
        }
    }

    suspend fun clearAll() {
        context.dataStore.edit { it.clear() }
    }
}
