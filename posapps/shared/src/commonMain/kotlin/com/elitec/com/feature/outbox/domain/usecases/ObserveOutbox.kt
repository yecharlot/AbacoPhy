package com.elitec.com.feature.outbox.domain.usecases

import com.elitec.com.feature.outbox.domain.entities.OutboxEntry
import com.elitec.com.feature.outbox.domain.repositories.OutboxRepository
import kotlinx.coroutines.flow.Flow

/** Observa todas las entradas de la cola (auditoría / pantalla de pendientes). */
class ObserveOutbox(
    private val repository: OutboxRepository,
) {
    fun execute(): Flow<List<OutboxEntry>> = repository.observeAll()
}
