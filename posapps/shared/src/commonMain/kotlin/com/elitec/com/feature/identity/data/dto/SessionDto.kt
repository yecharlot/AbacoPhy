package com.elitec.com.feature.identity.data.dto

import androidx.room3.Entity
import androidx.room3.PrimaryKey
import com.elitec.com.feature.identity.data.dto.UserDto.Companion.toData
import com.elitec.com.feature.identity.data.dto.UserDto.Companion.toDomain
import com.elitec.com.feature.identity.domain.entities.Session
import com.elitec.com.feature.identity.domain.entities.User
import kotlinx.datetime.LocalDateTime
import kotlinx.serialization.Serializable

@Serializable
@Entity
data class SessionDto(
    @PrimaryKey val token: String,
    val expiresAt: LocalDateTime?,
    val user: UserDto,
    val views: String,
    val modules: Map<String, Boolean>,
    val tenantName: String?,
    val rev: Double,
    val rootCid: String?,
    /** JSON string opaco; ausente si el API no lo envía. */
    val metadata: String?
) {
    companion object {
        fun SessionDto.toDomain(): Session =
            Session(
                token = this.token,
                expiresAt = this.expiresAt,
                user = this.user.toDomain(),
                views = this.views,
                modules = this.modules,
                tenantName = this.tenantName,
                rev = this.rev,
                rootCid = this.rootCid,
                metadata = this.metadata
            )

        fun Session.toData(): SessionDto =
            SessionDto(
                token = this.token,
                expiresAt = this.expiresAt,
                user = this.user.toData(),
                views = this.views,
                modules = this.modules,
                tenantName = this.tenantName,
                rev = this.rev,
                rootCid = this.rootCid,
                metadata = this.metadata
            )
    }
}
