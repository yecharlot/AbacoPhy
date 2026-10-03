package com.elitec.com.feature.identity.domain.caseuse

import com.elitec.com.feature.identity.domain.repository.AuthRepository
import com.elitec.com.feature.identity.domain.repository.SessionRepository

class LogoutCaseUse(
    private val auth: AuthRepository,
    private val sessions: SessionRepository,
) {
    suspend operator fun invoke(): Result<Unit> = runCatching {
        runCatching { auth.logout() }
        sessions.clearSession()
    }
}
