package com.elitec.com.feature.pos.domain.repository

import com.elitec.com.feature.pos.domain.entities.CreateSaleInput
import com.elitec.com.feature.pos.domain.entities.Sale
import kotlinx.coroutines.flow.Flow

/**
 * Contrato de ventas alineado con web (getSales / createSale)
 * más capacidades nativas: cache local y observación reactiva.
 */
interface SalesRepository {
    /** Lista ventas del tenant (GET /pos/sales). Opcionalmente refresca cache local. */
    suspend fun getSales(): List<Sale>

    /** Ventas filtradas por punto de venta (unitId). Si unitId vacío, equivale a getSales(). */
    suspend fun getSalesByUnitId(unitId: String): List<Sale>

    suspend fun getSaleById(id: String): Sale?

    /**
     * Registra venta (POST /pos/sales).
     * El server devuelve la Sale completa; se cachea en local.
     */
    suspend fun createSale(input: CreateSaleInput): Sale

    /** Observa el cache local de ventas (offline / UI reactiva). */
    fun observeSalesFlow(): Flow<List<Sale>>
}
