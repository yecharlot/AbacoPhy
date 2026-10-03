package com.elitec.com.feature.identity.data.dao

import androidx.room3.Dao
import androidx.room3.Insert
import androidx.room3.OnConflictStrategy
import androidx.room3.Query
import com.elitec.com.feature.identity.data.dto.SessionEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface SessionDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun save(session: SessionEntity)

    @Query("SELECT * FROM session_active WHERE id = 1 LIMIT 1")
    suspend fun get(): SessionEntity?

    @Query("SELECT * FROM session_active WHERE id = 1 LIMIT 1")
    fun observe(): Flow<SessionEntity?>

    @Query("DELETE FROM session_active")
    suspend fun clear()
}
