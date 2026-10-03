package com.elitec.com.feature.pos.data.repository

import com.elitec.com.feature.pos.data.dataSource.LocalSalesDataSource
import com.elitec.com.feature.pos.data.dataSource.RemoteSalesDataSource
import com.elitec.com.feature.pos.data.dto.toDomain
import com.elitec.com.feature.pos.domain.entities.CreateSaleInput
import com.elitec.com.feature.pos.domain.entities.Sale
import com.elitec.com.feature.pos.domain.repository.SalesRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class SaleRepositoryImpl(
    private val local: LocalSalesDataSource,
    private val remote: RemoteSalesDataSource,
) : SalesRepository {

    override suspend fun getSales(): List<Sale> {
        val remoteList = remote.listSales()
        local.saveAll(remoteList)
        return remoteList.map { it.toDomain() }
    }

    override suspend fun getSalesByUnitId(unitId: String): List<Sale> {
        val all = getSales()
        if (unitId.isBlank()) return all
        return all.filter { it.unitId == unitId }
    }

    override suspend fun getSaleById(id: String): Sale? {
        local.getById(id)?.let { return it.toDomain() }
        val remoteDto = remote.getById(id) ?: return null
        local.save(remoteDto)
        return remoteDto.toDomain()
    }

    override suspend fun createSale(input: CreateSaleInput): Sale {
        val created = remote.createSale(input)
        local.save(created)
        return created.toDomain()
    }

    override fun observeSalesFlow(): Flow<List<Sale>> =
        local.getSalesFlow().map { list -> list.map { it.toDomain() } }
}
