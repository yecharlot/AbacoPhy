package com.elitec.com.feature.identity.data.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class LoginResponseDto(
    val token: String,
    @SerialName("expires_at")
    val expiresAt: String,
    val user: UserDto,
    val views: List<String>,
    val modules: Map<String, Boolean>,
    /** JSON string opaco; ausente si el API no lo envía.*/
    val metadata: String?
)
