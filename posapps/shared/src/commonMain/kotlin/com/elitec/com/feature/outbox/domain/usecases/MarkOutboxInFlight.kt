package com.elitec.com.feature.outbox.domain.usecases

import com.elitec.com.feature.outbox.domain.entities.OutboxEntry
import com.elitec.com.feature.outbox.domain.entities.OutboxStatus
import com.elitec.com.feature.outbox.domain.repositories.OutboxRepository
import kotlin.time.Clock

/**
 * Marca envío en curso e incrementa [OutboxEntry.attempts].
 * Idempotente si ya está IN_FLIGHT.
 */
class MarkOutboxInFlight(
    private val repository: OutboxRepository,
) {
    suspend fun execute(id: String): OutboxEntry {
        val current = repository.getById(id) ?: error("Outbox no encontrada: $id")
        if (current.status == OutboxStatus.IN_FLIGHT) return current
        require(current.status == OutboxStatus.PENDING) {
            "Solo PENDING puede pasar a IN_FLIGHT (actual=${current.status})"
        }
        val updated = current.copy(
            status = OutboxStatus.IN_FLIGHT,
            attempts = current.attempts + 1,
            updatedAtEpochMs = Clock.System.now().toEpochMilliseconds(),
            lastError = null,
        )
        repository.update(updated)
        return updated
    }
}
