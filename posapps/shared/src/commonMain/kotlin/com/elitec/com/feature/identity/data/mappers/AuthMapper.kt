package com.elitec.com.feature.identity.data.mappers

import com.elitec.com.feature.identity.data.dto.LoginResponseDto
import com.elitec.com.feature.identity.data.dto.MeResponseDto
import com.elitec.com.feature.identity.domain.entities.Session
import com.elitec.com.feature.identity.domain.entities.User

object AuthMapper {
    fun loginToSession(dto: LoginResponseDto): Session {
        val u = dto.user
        return Session(
            token = dto.token,
            expiresAt = dto.expiresAt,
            user = User(
                id = u?.id.orEmpty(),
                username = u?.username.orEmpty(),
                displayName = u?.displayName ?: u?.username.orEmpty(),
                role = u?.role.orEmpty(),
                tenantId = u?.tenantId.orEmpty(),
                metadata = u?.metadata,
            ),
            views = dto.views.orEmpty(),
            modules = dto.modules.orEmpty(),
        )
    }

    fun meToSession(dto: MeResponseDto, token: String): Session {
        val u = dto.user
        return Session(
            token = token,
            expiresAt = null,
            user = User(
                id = u?.id.orEmpty(),
                username = u?.username.orEmpty(),
                displayName = u?.displayName ?: u?.username.orEmpty(),
                role = u?.role.orEmpty(),
                tenantId = u?.tenantId.orEmpty(),
                metadata = u?.metadata,
            ),
            views = dto.views.orEmpty(),
            modules = dto.modules.orEmpty(),
            tenantName = dto.tenant?.name,
            rev = dto.rev,
            rootCid = dto.rootCid,
        )
    }
}
