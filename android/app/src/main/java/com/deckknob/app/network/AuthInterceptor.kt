package com.deckknob.app.network

import com.deckknob.app.data.session.SessionManager
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthInterceptor @Inject constructor(
    private val sessionManager: SessionManager
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        
        // Skip auth for login/register/check-username
        val path = originalRequest.url.encodedPath
        if (path.contains("api/token/") || path.contains("api/users/register/") || path.contains("api/auth/check-username/")) {
            return chain.proceed(originalRequest)
        }

        // Blocking call to get token from DataStore flow
        val session = runBlocking { sessionManager.activeSession.firstOrNull() }
        val token = session?.accessToken

        if (token.isNullOrEmpty()) {
            return chain.proceed(originalRequest)
        }

        val authenticatedRequest = originalRequest.newBuilder()
            .header("Authorization", "Bearer $token")
            .build()
            
        return chain.proceed(authenticatedRequest)
    }
}
