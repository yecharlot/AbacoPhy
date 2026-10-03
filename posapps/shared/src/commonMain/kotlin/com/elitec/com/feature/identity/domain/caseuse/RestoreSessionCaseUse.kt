package com.elitec.com.feature.identity.domain.caseuse

import com.elitec.com.feature.identity.domain.entities.Session
import com.elitec.com.feature.identity.domain.repository.AuthRepository
import com.elitec.com.feature.identity.domain.repository.SessionRepository

/**
 * Arranque en frío: token local → GET /auth/me → refresca sesión o limpia.
 */
class RestoreSessionCaseUse(
    private val auth: AuthRepository,
    private val sessions: SessionRepository,
) {
    suspend operator fun invoke(): Result<Session?> = runCatching {
        val token = sessions.getActiveToken() ?: return@runCatching null
        val fresh = auth.getMe(token)
        sessions.saveSession(fresh)
        fresh
    }.onFailure {
        sessions.clearSession()
    }
}
