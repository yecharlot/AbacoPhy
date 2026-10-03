package com.elitec.com.feature.identity.data.dto

import com.elitec.com.feature.identity.domain.entities.LoginCredentials
import kotlinx.serialization.Serializable

@Serializable
data class LoginRequestDto (
    val username: String,
    val password: String,
/** JSON string opaco; ausente si el API no lo envía. */
    val metadata: String?
) {
    fun LoginCredentials.toApiRequest() : LoginRequestDto =
        LoginRequestDto(
            username = this.username,
            password = this.password,
            metadata = this.metadata
        )
}