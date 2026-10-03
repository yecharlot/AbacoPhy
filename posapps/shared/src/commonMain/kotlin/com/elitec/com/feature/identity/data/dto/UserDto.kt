package com.elitec.com.feature.identity.data.dto

import com.elitec.com.feature.identity.domain.entities.User
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class UserDto(
    val id: String? = null,
    val username: String? = null,
    @SerialName("display_name") val displayName: String? = null,
    val role: String? = null,
    @SerialName("tenant_id") val tenantId: String? = null,
    val metadata: String? = null,
)

fun UserDto.toDomain(): User = User(
    id = id.orEmpty(),
    username = username.orEmpty(),
    displayName = displayName ?: username.orEmpty(),
    role = role.orEmpty(),
    tenantId = tenantId.orEmpty(),
    metadata = metadata,
)
