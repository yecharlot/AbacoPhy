package com.elitec.com.feature.pos.data.dataSource

import com.elitec.com.feature.pos.data.dao.SaleDao
import com.elitec.com.feature.pos.data.dto.SaleDto
import kotlinx.coroutines.flow.Flow

class LocalSalesDataSource(
    private val salesDao: SaleDao,
) {
    fun getSalesFlow(): Flow<List<SaleDto>> = salesDao.getAllAsFlow()

    suspend fun save(sale: SaleDto) {
        salesDao.save(sale)
    }

    suspend fun saveAll(saleList: List<SaleDto>) {
        if (saleList.isEmpty()) return
        salesDao.saveAll(saleList)
    }

    suspend fun getById(saleId: String): SaleDto? = salesDao.getById(saleId)

    suspend fun getByUnitId(unitId: String): List<SaleDto> = salesDao.getByUnitId(unitId)
}
