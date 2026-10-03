package com.elitec.com.feature.identity.domain.caseuse

import com.elitec.com.feature.identity.domain.repository.AuthRepository
import com.elitec.com.feature.identity.domain.repository.SessionRepository

/**
 * Limpia el único token → SessionControl.NoSession (la UI reacciona sola).
 */
class LogoutCaseUse(
    private val auth: AuthRepository,
    private val sessions: SessionRepository,
) {
    suspend operator fun invoke(): Result<Unit> = runCatching {
        runCatching { auth.logout() }
        sessions.clearSession()
    }
}
