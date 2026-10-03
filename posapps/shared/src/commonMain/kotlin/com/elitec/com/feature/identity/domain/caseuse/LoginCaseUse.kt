package com.elitec.com.feature.identity.domain.caseuse

import com.elitec.com.feature.identity.domain.entities.LoginCredentials
import com.elitec.com.feature.identity.domain.entities.Session
import com.elitec.com.feature.identity.domain.repository.AuthRepository
import com.elitec.com.feature.identity.domain.repository.SessionRepository

class LoginCaseUse(
    private val auth: AuthRepository,
    private val sessions: SessionRepository,
) {
    suspend operator fun invoke(credentials: LoginCredentials): Result<Session> = runCatching {
        val session = auth.login(credentials)
        sessions.saveSession(session)
        session
    }
}
