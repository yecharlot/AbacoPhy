package com.elitec.com.feature.outbox.data.dto

import androidx.room3.Entity
import androidx.room3.Index
import androidx.room3.PrimaryKey

@Entity(
    tableName = "outbox_ops",
    indices = [
        Index(value = ["clientOpId"], unique = true),
        Index(value = ["status"]),
        Index(value = ["createdAtEpochMs"]),
    ],
)
data class OutboxEntity(
    @PrimaryKey val id: String,
    val clientOpId: String,
    val type: String,
    val payloadJson: String,
    val status: String,
    val createdAtEpochMs: Long,
    val updatedAtEpochMs: Long,
    val attempts: Int = 0,
    val lastError: String? = null,
    val serverId: String? = null,
    val contextJson: String? = null,
)
