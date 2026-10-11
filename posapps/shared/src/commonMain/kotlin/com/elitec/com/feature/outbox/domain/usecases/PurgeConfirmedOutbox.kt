package com.elitec.com.feature.outbox.domain.usecases

import com.elitec.com.feature.outbox.domain.entities.OutboxStatus
import com.elitec.com.feature.outbox.domain.repositories.OutboxRepository

/** Limpia entradas ya confirmadas (housekeeping). */
class PurgeConfirmedOutbox(
    private val repository: OutboxRepository,
) {
    suspend fun execute(): Int {
        val before = repository.countByStatus(OutboxStatus.CONFIRMED)
        repository.deleteByStatus(OutboxStatus.CONFIRMED)
        return before
    }
}
