package com.elitec.com.feature.identity.data.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ChangePasswordRequestDto(
    @SerialName("current_password")
    val currentPassword: String,
    @SerialName("new_password")
    val newPassword: String,
    val username: String,
    /** JSON string opaco; ausente si el API no lo envía. */
    val metadata: String?
)
