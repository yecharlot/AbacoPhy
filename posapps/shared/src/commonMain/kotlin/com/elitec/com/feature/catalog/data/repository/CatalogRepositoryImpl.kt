package com.elitec.com.feature.catalog.data.repository

import com.elitec.com.feature.catalog.data.dataSource.LocalCatalogDataSource
import com.elitec.com.feature.catalog.data.dataSource.RemoteCatalogDataSource
import com.elitec.com.feature.catalog.data.dto.toDomain
import com.elitec.com.feature.catalog.domain.entities.Product
import com.elitec.com.feature.catalog.domain.repository.CatalogRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class CatalogRepositoryImpl(
    private val local: LocalCatalogDataSource,
    private val remote: RemoteCatalogDataSource,
) : CatalogRepository {

    override suspend fun getProducts(): List<Product> {
        val remoteList = remote.listProducts()
        local.saveAll(remoteList)
        return remoteList.map { it.toDomain() }
    }

    override suspend fun getProductById(id: String): Product? {
        local.getById(id)?.let { return it.toDomain() }
        return getProducts().firstOrNull { it.id == id }
    }

    override fun observeProducts(): Flow<List<Product>> =
        local.observeProducts().map { list -> list.map { it.toDomain() } }
}
