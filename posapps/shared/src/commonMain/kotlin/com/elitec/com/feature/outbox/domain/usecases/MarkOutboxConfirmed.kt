package com.elitec.com.feature.outbox.domain.usecases

import com.elitec.com.feature.outbox.domain.entities.OutboxEntry
import com.elitec.com.feature.outbox.domain.entities.OutboxStatus
import com.elitec.com.feature.outbox.domain.repositories.OutboxRepository
import kotlin.time.Clock

/** Servidor aceptó la operación. */
class MarkOutboxConfirmed(
    private val repository: OutboxRepository,
) {
    suspend fun execute(id: String, serverId: String?): OutboxEntry {
        val current = repository.getById(id) ?: error("Outbox no encontrada: $id")
        require(
            current.status == OutboxStatus.IN_FLIGHT ||
                current.status == OutboxStatus.PENDING,
        ) {
            "No se puede confirmar desde ${current.status}"
        }
        val updated = current.copy(
            status = OutboxStatus.CONFIRMED,
            serverId = serverId?.takeIf { it.isNotBlank() } ?: current.serverId,
            updatedAtEpochMs = Clock.System.now().toEpochMilliseconds(),
            lastError = null,
        )
        repository.update(updated)
        return updated
    }
}
