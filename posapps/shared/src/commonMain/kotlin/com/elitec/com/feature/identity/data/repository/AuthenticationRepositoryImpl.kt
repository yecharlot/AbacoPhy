package com.elitec.com.feature.identity.data.repository

import com.elitec.com.feature.identity.data.dataSource.RemoteAuthDataSource
import com.elitec.com.feature.identity.data.mappers.AuthMapper
import com.elitec.com.feature.identity.domain.entities.ChangePasswordInput
import com.elitec.com.feature.identity.domain.entities.LoginCredentials
import com.elitec.com.feature.identity.domain.entities.Session
import com.elitec.com.feature.identity.domain.repository.AuthRepository
import com.elitec.com.feature.identity.domain.repository.SessionRepository

class AuthenticationRepositoryImpl(
    private val remote: RemoteAuthDataSource,
    private val sessions: SessionRepository,
) : AuthRepository {

    override suspend fun login(credentials: LoginCredentials): Session {
        val dto = remote.login(credentials.username.trim(), credentials.password)
        return AuthMapper.loginToSession(dto)
    }

    override suspend fun logout() {
        val token = sessions.getActiveToken()
        if (token != null) remote.logout(token)
    }

    override suspend fun getMe(token: String): Session {
        val dto = remote.me(token)
        return AuthMapper.meToSession(dto, token)
    }

    override suspend fun changePassword(input: ChangePasswordInput) {
        val token = sessions.getActiveToken() ?: error("No hay sesión activa")
        remote.changePassword(
            token,
            ChangePasswordRequestDto(
                currentPassword = input.currentPassword,
                newPassword = input.newPassword,
                username = input.username,
            ),
        )
    }
}
