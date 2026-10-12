package com.elitec.com.feature.outbox.domain.usecases

import com.elitec.com.feature.outbox.domain.entities.OutboxEntry
import com.elitec.com.feature.outbox.domain.entities.OutboxIds
import com.elitec.com.feature.outbox.domain.entities.OutboxOpType
import com.elitec.com.feature.outbox.domain.entities.OutboxStatus
import com.elitec.com.feature.outbox.domain.repositories.OutboxRepository
import kotlin.time.Clock

/**
 * Encola una operación saliente. No llama a red.
 * Si ya existe el mismo [clientOpId], devuelve la entrada existente (idempotencia local).
 */
class EnqueueOutboxOp(
    private val repository: OutboxRepository,
) {
    data class Input(
        val type: OutboxOpType,
        val payloadJson: String,
        val clientOpId: String? = null,
        val contextJson: String? = null,
    )

    suspend fun execute(input: Input): OutboxEntry {
        require(input.payloadJson.isNotBlank()) { "payloadJson vacío" }

        val opId = input.clientOpId?.takeIf { it.isNotBlank() } ?: OutboxIds.newClientOpId()
        repository.getByClientOpId(opId)?.let { return it }

        val now = Clock.System.now().toEpochMilliseconds()
        val entry = OutboxEntry(
            id = OutboxIds.newEntryId(),
            clientOpId = opId,
            type = input.type,
            payloadJson = input.payloadJson,
            status = OutboxStatus.PENDING,
            createdAtEpochMs = now,
            updatedAtEpochMs = now,
            attempts = 0,
            lastError = null,
            serverId = null,
            contextJson = input.contextJson,
        )
        repository.enqueue(entry)
        return entry
    }
}
