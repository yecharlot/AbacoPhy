package com.elitec.com.feature.identity.data.dto

import com.elitec.com.feature.identity.domain.entities.User
import kotlinx.serialization.Serializable

@Serializable
data class UserDto(
    val id: String,
    val username: String,
    val displayName: String,
    val role: String,
    val tenantId: String,
    /** JSON string opaco; ausente si el API no lo envía. */
    val metadata: String?
) {
    companion object{
        fun UserDto.toDomain(): User =
            User(
                id = this.id,
                username = this.username,
                displayName = this.displayName,
                role = this.role,
                tenantId = this.tenantId,
                metadata = this.metadata
            )

        fun User.toData(): UserDto =
            UserDto(
                id = this.id,
                username = this.username,
                displayName = this.displayName,
                role = this.role,
                tenantId = this.tenantId,
                metadata = this.metadata
            )
    }
}