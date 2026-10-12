package com.elitec.com.feature.outbox.data.dao

import androidx.room3.Dao
import androidx.room3.Insert
import androidx.room3.OnConflictStrategy
import androidx.room3.Query
import androidx.room3.Update
import com.elitec.com.feature.outbox.data.dto.OutboxEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface OutboxDao {
    @Insert(onConflict = OnConflictStrategy.ABORT)
    suspend fun insert(entity: OutboxEntity)

    @Update
    suspend fun update(entity: OutboxEntity)

    @Query("SELECT * FROM outbox_ops WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): OutboxEntity?

    @Query("SELECT * FROM outbox_ops WHERE clientOpId = :clientOpId LIMIT 1")
    suspend fun getByClientOpId(clientOpId: String): OutboxEntity?

    @Query("SELECT * FROM outbox_ops WHERE status IN (:statuses) ORDER BY createdAtEpochMs ASC")
    suspend fun listByStatuses(statuses: List<String>): List<OutboxEntity>

    @Query(
        """
        SELECT * FROM outbox_ops
        WHERE status = 'PENDING'
        ORDER BY createdAtEpochMs ASC
        LIMIT :limit
        """,
    )
    suspend fun listPending(limit: Int): List<OutboxEntity>

    @Query("SELECT * FROM outbox_ops ORDER BY createdAtEpochMs DESC")
    fun observeAll(): Flow<List<OutboxEntity>>

    @Query(
        """
        SELECT * FROM outbox_ops
        WHERE status IN ('PENDING', 'IN_FLIGHT')
        ORDER BY createdAtEpochMs ASC
        """,
    )
    fun observePendingWork(): Flow<List<OutboxEntity>>

    @Query(
        """
        SELECT COUNT(*) FROM outbox_ops
        WHERE status IN ('PENDING', 'IN_FLIGHT')
        """,
    )
    fun observePendingCount(): Flow<Int>

    @Query("SELECT COUNT(*) FROM outbox_ops WHERE status = :status")
    suspend fun countByStatus(status: String): Int

    @Query("DELETE FROM outbox_ops WHERE id = :id")
    suspend fun deleteById(id: String)

    @Query("DELETE FROM outbox_ops WHERE status = :status")
    suspend fun deleteByStatus(status: String)
}
