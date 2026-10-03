package com.elitec.com.feature.pos.data.dao

import androidx.room3.Dao
import androidx.room3.Insert
import androidx.room3.OnConflictStrategy
import androidx.room3.Query
import com.elitec.com.feature.pos.data.dto.SaleDto
import kotlinx.coroutines.flow.Flow

@Dao
interface SaleDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun save(saleDto: SaleDto)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveAll(saleList: List<SaleDto>)

    @Query("SELECT * FROM pos_sales ORDER BY date DESC")
    fun getAllAsFlow(): Flow<List<SaleDto>>

    @Query("SELECT * FROM pos_sales WHERE id = :saleId LIMIT 1")
    suspend fun getById(saleId: String): SaleDto?

    @Query("SELECT * FROM pos_sales WHERE unitId = :unitId ORDER BY date DESC")
    suspend fun getByUnitId(unitId: String): List<SaleDto>

    @Query("DELETE FROM pos_sales")
    suspend fun clearAll()
}
