package com.elitec.com.feature.outbox.domain.usecases

import com.elitec.com.feature.outbox.domain.entities.OutboxEntry
import com.elitec.com.feature.outbox.domain.repositories.OutboxRepository
import kotlinx.coroutines.flow.Flow

/** Solo PENDING + IN_FLIGHT (trabajo no confirmado). */
class ObservePendingOutbox(
    private val repository: OutboxRepository,
) {
    fun execute(): Flow<List<OutboxEntry>> = repository.observePendingWork()
}
