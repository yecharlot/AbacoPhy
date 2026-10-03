package com.elitec.com.feature.pos.domain.repository

import com.elitec.com.feature.pos.domain.entities.Sale
import kotlinx.coroutines.flow.Flow

interface SalesRepository {
    suspend fun createSale(sale: Sale, tokenAuth: String)
    suspend fun getSalesById(id: String): Sale?
    suspend fun getSalesByPOSId(posId: String): List<Sale>
    fun observeSalesFlow(): Flow<List<Sale>>
}