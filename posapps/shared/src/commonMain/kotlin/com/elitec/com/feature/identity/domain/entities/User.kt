package com.elitec.com.feature.identity.domain.entities

data class User(
    val id: String,
    val username: String,
    val displayName: String,
    val role: String,
    val tenantId: String,
    /** JSON string opaco; ausente si el API no lo envía. */
    val metadata: String?
)