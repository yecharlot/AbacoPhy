package com.elitec.com.feature.identity.domain.entities

import kotlinx.datetime.LocalDateTime

data class Session(
    val token: String,
    val expiresAt: LocalDateTime?,
    val user: User,
    val views: String,
    val modules: Map<String, Boolean>,
    val tenantName: String?,
    val rev: Double,
    val rootCid: String?,
    /** JSON string opaco; ausente si el API no lo envía. */
    val metadata: String?
)


data class LoginCredentials (
    val username: String,
    val password: String,
    /** JSON string opaco; ausente si el API no lo envía. */
    val metadata: String?
)

data class ChangePasswordInput (
    val currentPassword: String,
    val newPassword: String,
    /** Admin/master only: change another user */
    val username: String?,
    /** JSON string opaco; ausente si el API no lo envía. */
    val metadata: String?
)