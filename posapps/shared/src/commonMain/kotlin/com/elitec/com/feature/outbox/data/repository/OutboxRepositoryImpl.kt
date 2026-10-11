package com.elitec.com.feature.outbox.data.repository

import com.elitec.com.feature.outbox.data.dao.OutboxDao
import com.elitec.com.feature.outbox.data.mappers.toDomain
import com.elitec.com.feature.outbox.data.mappers.toEntity
import com.elitec.com.feature.outbox.domain.entities.OutboxEntry
import com.elitec.com.feature.outbox.domain.entities.OutboxStatus
import com.elitec.com.feature.outbox.domain.repositories.OutboxRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class OutboxRepositoryImpl(
    private val dao: OutboxDao,
) : OutboxRepository {
    override suspend fun enqueue(entry: OutboxEntry) {
        dao.insert(entry.toEntity())
    }

    override suspend fun getById(id: String): OutboxEntry? =
        dao.getById(id)?.toDomain()

    override suspend fun getByClientOpId(clientOpId: String): OutboxEntry? =
        dao.getByClientOpId(clientOpId)?.toDomain()

    override suspend fun listByStatus(vararg status: OutboxStatus): List<OutboxEntry> {
        if (status.isEmpty()) return emptyList()
        return dao.listByStatuses(status.map { it.name }).map { it.toDomain() }
    }

    override suspend fun listRetryable(limit: Int): List<OutboxEntry> =
        dao.listPending(limit).map { it.toDomain() }

    override fun observeAll(): Flow<List<OutboxEntry>> =
        dao.observeAll().map { list -> list.map { it.toDomain() } }

    override fun observePendingWork(): Flow<List<OutboxEntry>> =
        dao.observePendingWork().map { list -> list.map { it.toDomain() } }

    override fun observePendingCount(): Flow<Int> =
        dao.observePendingCount()

    override suspend fun update(entry: OutboxEntry) {
        dao.update(entry.toEntity())
    }

    override suspend fun delete(id: String) {
        dao.deleteById(id)
    }

    override suspend fun deleteByStatus(status: OutboxStatus) {
        dao.deleteByStatus(status.name)
    }

    override suspend fun countByStatus(status: OutboxStatus): Int =
        dao.countByStatus(status.name)
}
