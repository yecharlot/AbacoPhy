package com.elitec.com.feature.outbox.data.mappers

import com.elitec.com.feature.outbox.data.dto.OutboxEntity
import com.elitec.com.feature.outbox.domain.entities.OutboxEntry
import com.elitec.com.feature.outbox.domain.entities.OutboxOpType
import com.elitec.com.feature.outbox.domain.entities.OutboxStatus

fun OutboxEntity.toDomain(): OutboxEntry = OutboxEntry(
    id = id,
    clientOpId = clientOpId,
    type = OutboxOpType.fromStorage(type),
    payloadJson = payloadJson,
    status = OutboxStatus.fromStorage(status),
    createdAtEpochMs = createdAtEpochMs,
    updatedAtEpochMs = updatedAtEpochMs,
    attempts = attempts,
    lastError = lastError,
    serverId = serverId,
    contextJson = contextJson,
)

fun OutboxEntry.toEntity(): OutboxEntity = OutboxEntity(
    id = id,
    clientOpId = clientOpId,
    type = type.name,
    payloadJson = payloadJson,
    status = status.name,
    createdAtEpochMs = createdAtEpochMs,
    updatedAtEpochMs = updatedAtEpochMs,
    attempts = attempts,
    lastError = lastError,
    serverId = serverId,
    contextJson = contextJson,
)
