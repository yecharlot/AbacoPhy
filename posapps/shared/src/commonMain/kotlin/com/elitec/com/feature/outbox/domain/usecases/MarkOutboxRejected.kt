package com.elitec.com.feature.outbox.domain.usecases

import com.elitec.com.feature.outbox.domain.entities.OutboxEntry
import com.elitec.com.feature.outbox.domain.entities.OutboxStatus
import com.elitec.com.feature.outbox.domain.repositories.OutboxRepository
import kotlin.time.Clock

/** Rechazo de negocio (no reintentar automáticamente). */
class MarkOutboxRejected(
    private val repository: OutboxRepository,
) {
    suspend fun execute(id: String, reason: String): OutboxEntry {
        val current = repository.getById(id) ?: error("Outbox no encontrada: $id")
        val updated = current.copy(
            status = OutboxStatus.REJECTED,
            lastError = reason.take(500),
            updatedAtEpochMs = Clock.System.now().toEpochMilliseconds(),
        )
        repository.update(updated)
        return updated
    }
}
