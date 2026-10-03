package com.elitec.com.feature.identity.data.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class LoginRequestDto(
    val username: String,
    val password: String,
)

@Serializable
data class LoginResponseDto(
    val token: String,
    @SerialName("expires_at") val expiresAt: String? = null,
    val user: UserDto? = null,
    val views: List<String>? = null,
    val modules: Map<String, Boolean>? = null,
)

@Serializable
data class ChangePasswordRequestDto(
    @SerialName("current_password") val currentPassword: String,
    @SerialName("new_password") val newPassword: String,
    val username: String? = null,
)
