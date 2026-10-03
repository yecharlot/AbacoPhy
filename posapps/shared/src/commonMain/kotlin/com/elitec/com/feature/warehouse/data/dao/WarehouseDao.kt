package com.elitec.com.feature.warehouse.data.dao

import androidx.room3.Dao
import androidx.room3.Insert
import androidx.room3.OnConflictStrategy
import androidx.room3.Query
import com.elitec.com.feature.warehouse.data.dto.SalesUnitEntity
import com.elitec.com.feature.warehouse.data.dto.UnitStockEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface WarehouseDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveUnits(units: List<SalesUnitEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveUnitStocks(stocks: List<UnitStockEntity>)

    @Query("SELECT * FROM sales_units WHERE active = 1 OR active IS NULL ORDER BY name ASC")
    fun observeUnits(): Flow<List<SalesUnitEntity>>

    @Query("SELECT * FROM unit_stocks")
    fun observeAllUnitStocks(): Flow<List<UnitStockEntity>>

    @Query("SELECT * FROM unit_stocks WHERE unitId = :unitId")
    fun observeUnitStocks(unitId: String): Flow<List<UnitStockEntity>>

    @Query("DELETE FROM sales_units")
    suspend fun clearUnits()

    @Query("DELETE FROM unit_stocks")
    suspend fun clearUnitStocks()
}
