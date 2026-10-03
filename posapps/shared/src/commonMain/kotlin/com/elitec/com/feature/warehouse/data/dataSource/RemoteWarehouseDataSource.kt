package com.elitec.com.feature.warehouse.data.dataSource

import com.elitec.com.feature.warehouse.data.dto.SalesUnitsResponseDto
import com.elitec.com.feature.warehouse.data.dto.WarehouseResponseDto
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.bearerAuth
import io.ktor.client.request.get
import io.ktor.http.isSuccess

/**
 * Alineado con web:
 *   GET /units      → SalesUnitsResponseDto
 *   GET /warehouse  → WarehouseResponseDto
 */
class RemoteWarehouseDataSource(
    private val http: HttpClient,
    private val baseUrl: String,
    private val tokenProvider: suspend () -> String?,
) {
    private fun url(path: String) = baseUrl.trimEnd('/') + path

    init {
        require(baseUrl.isNotBlank()) { "apiBaseUrl vacío" }
    }

    private suspend fun token(): String =
        tokenProvider() ?: error("No hay sesión activa")

    suspend fun getSalesUnits(): SalesUnitsResponseDto {
        val response = http.get(url("/units")) { bearerAuth(token()) }
        if (!response.status.isSuccess()) {
            error("No se pudieron cargar unidades (HTTP ${response.status.value})")
        }
        return response.body()
    }

    suspend fun getWarehouse(): WarehouseResponseDto {
        val response = http.get(url("/warehouse")) { bearerAuth(token()) }
        if (!response.status.isSuccess()) {
            error("No se pudo cargar stock de almacén (HTTP ${response.status.value})")
        }
        return response.body()
    }
}
