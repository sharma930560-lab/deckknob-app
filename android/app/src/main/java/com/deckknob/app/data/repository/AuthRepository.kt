package com.deckknob.app.data.repository

import com.deckknob.app.data.model.*
import com.deckknob.app.data.session.SessionManager
import com.deckknob.app.network.AuthApi
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val authApi: AuthApi,
    private val sessionManager: SessionManager
) {
    val activeSession = sessionManager.activeSession
    val allSessions = sessionManager.sessions

    suspend fun login(request: LoginRequest): Result<AuthResponse> {
        return try {
            val response = authApi.login(request)
            if (response.isSuccessful && response.body() != null) {
                val authResponse = response.body()!!
                sessionManager.saveSession(authResponse)
                Result.success(authResponse)
            } else {
                Result.failure(Exception("Login failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun register(request: RegisterRequest): Result<UserDto> {
        return try {
            val response = authApi.register(request)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Registration failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun checkUsername(username: String): Result<UsernameCheckResponse> {
        return try {
            val response = authApi.checkUsername(username)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Check failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun switchAccount(userId: Int) {
        sessionManager.switchAccount(userId)
    }

    suspend fun logout(userId: Int) {
        sessionManager.logout(userId)
    }
}
