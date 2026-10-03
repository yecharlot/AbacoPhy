package com.elitec.com.feature.pos.data.dataSource

import com.elitec.com.feature.pos.data.dao.SaleDao
import com.elitec.com.feature.pos.data.dto.SaleDto
import com.elitec.com.feature.pos.data.dto.SaleDto.Companion.toDomain
import com.elitec.com.feature.pos.domain.entities.Sale
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch

class LocalSalesDataSource(
    private val salesDao: SaleDao
) {
    fun getSalesFlow() = salesDao.getAllAsFlow()

    suspend fun save(sale: SaleDto) {
        salesDao.save(sale)
    }

    suspend fun saveAll(saleList: List<SaleDto>) {
        salesDao.saveAll(saleList)
    }

    suspend fun getById(saleId: String): SaleDto? {
        return salesDao.getById(saleId)
    }
}