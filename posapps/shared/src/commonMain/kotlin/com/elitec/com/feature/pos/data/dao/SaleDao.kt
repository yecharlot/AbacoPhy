package com.elitec.com.feature.pos.data.dao

import androidx.room3.Dao
import androidx.room3.Insert
import androidx.room3.Query
import com.elitec.com.feature.pos.data.dto.SaleDto
import kotlinx.coroutines.flow.Flow

@Dao
interface SaleDao {
    @Insert
    suspend fun save(saleDto: SaleDto)

    @Insert
    suspend fun saveAll(saleList: List<SaleDto>)

    @Query("SELECT * FROM SaleDto")
    fun getAllAsFlow(): Flow<List<SaleDto>>

    @Query("SELECT * FROM SaleDto WHERE saleId = :saleId")
    suspend fun getById(saleId: String): SaleDto?
}