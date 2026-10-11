package com.elitec.com.feature.outbox.domain.usecases

import com.elitec.com.feature.outbox.domain.repositories.OutboxRepository
import kotlinx.coroutines.flow.Flow

/** Contador para badge UI (fase posterior). */
class ObservePendingOutboxCount(
    private val repository: OutboxRepository,
) {
    fun execute(): Flow<Int> = repository.observePendingCount()
}
