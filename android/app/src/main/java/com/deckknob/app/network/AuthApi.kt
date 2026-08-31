package com.deckknob.app.network

import com.deckknob.app.data.model.*
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

interface AuthApi {
    @POST("api/users/register/")
    suspend fun register(@Body request: RegisterRequest): Response<UserDto>

    @POST("api/token/")
    suspend fun login(@Body request: LoginRequest): Response<AuthResponse>

    @GET("api/auth/check-username/")
    suspend fun checkUsername(@Query("username") username: String): Response<UsernameCheckResponse>
}
