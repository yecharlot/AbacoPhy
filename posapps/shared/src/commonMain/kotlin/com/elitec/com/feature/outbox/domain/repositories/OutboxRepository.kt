package com.elitec.com.feature.outbox.domain.repositories

import com.elitec.com.feature.outbox.domain.entities.OutboxEntry
import com.elitec.com.feature.outbox.domain.entities.OutboxStatus
import kotlinx.coroutines.flow.Flow

/**
 * Contrato de la cola saliente. Solo persistencia local; el envío HTTP
 * lo orquesta un use case de sync (fase posterior).
 */
interface OutboxRepository {
    suspend fun enqueue(entry: OutboxEntry)

    suspend fun getById(id: String): OutboxEntry?

    suspend fun getByClientOpId(clientOpId: String): OutboxEntry?

    suspend fun listByStatus(vararg status: OutboxStatus): List<OutboxEntry>

    /** PENDING ordenadas por creación (FIFO). */
    suspend fun listRetryable(limit: Int = 50): List<OutboxEntry>

    fun observeAll(): Flow<List<OutboxEntry>>

    fun observePendingWork(): Flow<List<OutboxEntry>>

    fun observePendingCount(): Flow<Int>

    suspend fun update(entry: OutboxEntry)

    suspend fun delete(id: String)

    suspend fun deleteByStatus(status: OutboxStatus)

    suspend fun countByStatus(status: OutboxStatus): Int
}
