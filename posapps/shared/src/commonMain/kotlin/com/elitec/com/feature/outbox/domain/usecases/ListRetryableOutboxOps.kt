package com.elitec.com.feature.outbox.domain.usecases

import com.elitec.com.feature.outbox.domain.entities.OutboxEntry
import com.elitec.com.feature.outbox.domain.repositories.OutboxRepository

/** FIFO de operaciones listas para reintento / primer envío. */
class ListRetryableOutboxOps(
    private val repository: OutboxRepository,
) {
    suspend fun execute(limit: Int = 50): List<OutboxEntry> =
        repository.listRetryable(limit.coerceIn(1, 200))
}
