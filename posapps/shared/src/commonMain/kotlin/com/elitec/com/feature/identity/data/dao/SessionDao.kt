package com.elitec.com.feature.identity.data.dao

import androidx.room3.Dao
import androidx.room3.Delete
import androidx.room3.Insert
import androidx.room3.Query
import androidx.room3.Transaction
import androidx.room3.Upsert
import com.elitec.com.feature.identity.data.dto.SessionDto
import com.elitec.com.feature.pos.data.dto.SaleDto
import kotlinx.coroutines.flow.Flow

@Dao
interface SessionDao {
    @Query("SELECT * FROM SessionDto")
    fun getAllAsFlow(): Flow<List<SessionDto>>

    @Upsert
    suspend fun saveOrModify(sessionDto: SessionDto)

    @Delete
    suspend fun delete(sessionId: String)

    @Query("SELECT * FROM SessionSto WHERE token = :token")
    suspend fun getByToken(token: String): SessionDto?

    @Transaction
    @Query("DELETE * FROM SessionSto")
    suspend fun deleteSession()
}