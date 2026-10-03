package com.elitec.com.feature.identity.domain.caseuse

import com.elitec.com.feature.identity.domain.repository.AuthRepository
import com.elitec.com.feature.identity.domain.repository.SessionRepository
import com.elitec.com.infraestructure.logging.AbacoLog
import com.elitec.com.infraestructure.logging.LogCategory
import kotlin.time.TimeSource
import kotlinx.coroutines.delay

/**
 * Arranque reactivo:
 * Reading → (token?) → validar getMe → Active | NoSession
 */
class BootstrapSessionCaseUse(
    private val sessions: SessionRepository,
    private val auth: AuthRepository,
) {
    suspend operator fun invoke(minDisplayMs: Long = 1_000L) {
        val mark = TimeSource.Monotonic.markNow()
        sessions.markReading()
        AbacoLog.step(LogCategory.AUTH, "Bootstrap", "start")

        val token = sessions.getActiveToken()
        if (token.isNullOrBlank()) {
            AbacoLog.step(LogCategory.AUTH, "Bootstrap", "sin token local")
            awaitMin(mark, minDisplayMs)
            sessions.clearSession()
            return
        }

        AbacoLog.step(LogCategory.AUTH, "Bootstrap", "validando token")
        val result = runCatching { auth.getMe(token) }
        awaitMin(mark, minDisplayMs)

        result
            .onSuccess { session ->
                AbacoLog.step(LogCategory.AUTH, "Bootstrap", "token OK")
                sessions.saveSession(session)
            }
            .onFailure { e ->
                AbacoLog.w(LogCategory.AUTH, "Bootstrap token inválido: ${e.message}", e)
                sessions.clearSession()
            }
    }

    private suspend fun awaitMin(mark: TimeSource.Monotonic.ValueTimeMark, minMs: Long) {
        val remaining = minMs - mark.elapsedNow().inWholeMilliseconds
        if (remaining > 0) delay(remaining)
    }
}
