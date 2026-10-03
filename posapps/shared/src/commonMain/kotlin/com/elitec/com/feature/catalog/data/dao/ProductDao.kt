package com.elitec.com.feature.catalog.data.dao

import androidx.room3.Dao
import androidx.room3.Insert
import androidx.room3.OnConflictStrategy
import androidx.room3.Query
import com.elitec.com.feature.catalog.data.dto.ProductDto
import kotlinx.coroutines.flow.Flow

@Dao
interface ProductDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveAll(items: List<ProductDto>)

    @Query("SELECT * FROM catalog_products ORDER BY name ASC")
    fun observeAll(): Flow<List<ProductDto>>

    @Query("SELECT * FROM catalog_products WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): ProductDto?

    @Query("DELETE FROM catalog_products")
    suspend fun clear()
}
