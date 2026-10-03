package com.elitec.com.feature.pos.data.repository

import com.elitec.com.feature.pos.data.dataSource.LocalSalesDataSource
import com.elitec.com.feature.pos.data.dataSource.RemoteSalesDataSource
import com.elitec.com.feature.pos.data.dto.SaleDto.Companion.toData
import com.elitec.com.feature.pos.data.dto.SaleDto.Companion.toDomain
import com.elitec.com.feature.pos.domain.entities.Sale
import com.elitec.com.feature.pos.domain.repository.SalesRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class SaleRepositoryImpl(
    private val localDataSource: LocalSalesDataSource,
    private val remoteDataSource: RemoteSalesDataSource
): SalesRepository {

    override suspend fun createSale(sale: Sale, tokenAuth: String) {
        remoteDataSource.save(
            sale = sale.toData(),
            tokenAuth = tokenAuth,
            onSaveSuccess = {
                localDataSource.save(sale.toData())
            }
        )
    }

    override suspend fun getSalesById(id: String): Sale? {
        val localResult = localDataSource.getById(id)

        if(localResult == null) {
            val remoteResult = remoteDataSource.getById(id) ?: return null
            localDataSource.save(remoteResult)
            return remoteResult.toDomain()
        }
        return localResult.toDomain()
    }

    override suspend fun getSalesByPOSId(posId: String): List<Sale> {
        val response = remoteDataSource.getSaleList(posId =  posId)
        localDataSource.saveAll(response)
        return response.map { it.toDomain() }
    }

    override fun observeSalesFlow(): Flow<List<Sale>> =
        localDataSource.getSalesFlow().map { saleList ->
            saleList.map { it.toDomain() }
        }
}