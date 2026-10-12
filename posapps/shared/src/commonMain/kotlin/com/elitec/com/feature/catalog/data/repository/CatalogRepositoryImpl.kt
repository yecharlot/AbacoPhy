package com.elitec.com.feature.catalog.data.repository

import com.elitec.com.feature.catalog.data.dataSource.LocalCatalogDataSource
import com.elitec.com.feature.catalog.data.dataSource.RemoteCatalogDataSource
import com.elitec.com.feature.catalog.data.dto.toDomain
import com.elitec.com.feature.catalog.domain.entities.Product
import com.elitec.com.feature.catalog.domain.repository.CatalogRepository
import com.elitec.com.infraestructure.logging.AbacoLog
import com.elitec.com.infraestructure.logging.LogCategory
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class CatalogRepositoryImpl(
    private val local: LocalCatalogDataSource,
    private val remote: RemoteCatalogDataSource,
) : CatalogRepository {

    override suspend fun getProducts(): List<Product> {
        return try {
            val remoteList = remote.listProducts()
            local.saveAll(remoteList)
            remoteList.map { it.toDomain() }
        } catch (t: Throwable) {
            AbacoLog.w(LogCategory.POS, "getProducts remote fail → local: ${t.message}")
            local.getAll().map { it.toDomain() }
        }
    }

    override suspend fun getProductById(id: String): Product? {
        local.getById(id)?.let { return it.toDomain() }
        return try {
            getProducts().firstOrNull { it.id == id }
        } catch (_: Throwable) {
            null
        }
    }

    override fun observeProducts(): Flow<List<Product>> =
        local.observeProducts().map { list -> list.map { it.toDomain() } }
}
