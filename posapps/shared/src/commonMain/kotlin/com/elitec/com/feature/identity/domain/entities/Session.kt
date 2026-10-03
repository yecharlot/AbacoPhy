package com.elitec.com.feature.identity.domain.entities

/**
 * Sesión alineada con web Session.
 * views es List (API string[]); modules map de flags.
 */
data class Session(
    val token: String,
    val expiresAt: String? = null,
    val user: User,
    val views: List<String> = emptyList(),
    val modules: Map<String, Boolean> = emptyMap(),
    val tenantName: String? = null,
    val rev: Double? = null,
    val rootCid: String? = null,
    val metadata: String? = null,
)

data class LoginCredentials(
    val username: String,
    val password: String,
)

data class ChangePasswordInput(
    val currentPassword: String,
    val newPassword: String,
    val username: String? = null,
)
