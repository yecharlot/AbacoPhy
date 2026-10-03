package com.elitec.com.feature.catalog.data.dataSource

import com.elitec.com.feature.catalog.data.dao.ProductDao
import com.elitec.com.feature.catalog.data.dto.ProductDto
import kotlinx.coroutines.flow.Flow

class LocalCatalogDataSource(
    private val dao: ProductDao,
) {
    fun observeProducts(): Flow<List<ProductDto>> = dao.observeAll()
    suspend fun saveAll(items: List<ProductDto>) = dao.saveAll(items)
    suspend fun getById(id: String): ProductDto? = dao.getById(id)
}
