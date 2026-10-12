package com.elitec.com.feature.outbox.domain.usecases

import com.elitec.com.feature.outbox.domain.entities.OutboxEntry
import com.elitec.com.feature.outbox.domain.entities.OutboxStatus
import com.elitec.com.feature.outbox.domain.repositories.OutboxRepository
import kotlin.time.Clock

/**
 * Fallo de transporte / 5xx: vuelve a PENDING o FAILED_NEEDS_ATTENTION
 * si se superó [maxAttempts].
 */
class MarkOutboxFailedRetry(
    private val repository: OutboxRepository,
) {
    companion object {
        const val DEFAULT_MAX_ATTEMPTS = 8
    }

    suspend fun execute(
        id: String,
        error: String,
        maxAttempts: Int = DEFAULT_MAX_ATTEMPTS,
    ): OutboxEntry {
        val current = repository.getById(id) ?: error("Outbox no encontrada: $id")
        val nextStatus =
            if (current.attempts >= maxAttempts) {
                OutboxStatus.FAILED_NEEDS_ATTENTION
            } else {
                OutboxStatus.PENDING
            }
        val updated = current.copy(
            status = nextStatus,
            lastError = error.take(500),
            updatedAtEpochMs = Clock.System.now().toEpochMilliseconds(),
        )
        repository.update(updated)
        return updated
    }
}
