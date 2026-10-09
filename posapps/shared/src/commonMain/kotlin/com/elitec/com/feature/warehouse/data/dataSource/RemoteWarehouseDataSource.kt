package com.elitec.com.feature.warehouse.data.dataSource

import com.elitec.com.feature.warehouse.data.dto.SalesUnitDto
import com.elitec.com.feature.warehouse.data.dto.SalesUnitsResponseDto
import com.elitec.com.feature.warehouse.data.dto.UnitStockDto
import com.elitec.com.feature.warehouse.data.dto.WarehouseResponseDto
import com.elitec.com.infraestructure.logging.AbacoLog
import com.elitec.com.infraestructure.logging.LogCategory
import com.elitec.com.infraestructure.network.ApiConfig
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.bearerAuth
import io.ktor.client.request.get
import io.ktor.http.isSuccess
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.jsonObject

/**
 * Alineado con web:
 *   GET /units      → SalesUnitsResponseDto
 *   GET /warehouse  → WarehouseResponseDto
 *
 * Para usuarios operativos que no tienen permiso sobre /units, el listado
 * de PDV se obtiene desde /sync, que contiene snapshot.sales_units.
 */
class RemoteWarehouseDataSource(
    private val http: HttpClient,
    private val apiConfig: ApiConfig,
    private val tokenProvider: suspend () -> String?,
) {
    private val json = Json { ignoreUnknownKeys = true }

    private fun url(path: String) = apiConfig.requireBaseUrl().trimEnd('/') + path

    private suspend fun token(): String =
        tokenProvider() ?: error("No hay sesión activa")

    suspend fun getSalesUnits(): SalesUnitsResponseDto {
        val authToken = token()
        val response = http.get(url("/units")) { bearerAuth(authToken) }

        if (response.status.isSuccess()) {
            return response.body()
        }

        AbacoLog.apiResponse(
            "GET",
            url("/units"),
            response.status.value,
            "fallback a /sync para resolver puntos de venta",
        )

        return getSalesUnitsFromSync(authToken)
    }

    /**
     * /sync expone snapshot.sales_units como mapa:
     *
     * "sales_units": {
     *   "<unitId>": {
     *      "id": "...",
     *      "name": "...",
     *      ...
     *   }
     * }
     *
     * Se transforma al mismo DTO que utiliza GET /units, por lo que el
     * resto del módulo warehouse/POS no necesita conocer la fuente.
     */
    private suspend fun getSalesUnitsFromSync(authToken: String): SalesUnitsResponseDto {
        val endpoint = url("/sync")
        val response = http.get(endpoint) { bearerAuth(authToken) }

        if (!response.status.isSuccess()) {
            error(
                "No se pudieron cargar puntos de venta desde /sync " +
                    "(HTTP ${response.status.value})",
            )
        }

        val root = response.body<JsonObject>()
        val snapshot = root["snapshot"]?.jsonObject
            ?: error("Respuesta /sync sin snapshot")

        val unitsElement = snapshot["sales_units"]
            ?: snapshot["salesUnits"]
            ?: error("Respuesta /sync sin sales_units")

        val units = when (unitsElement) {
            is JsonObject -> unitsElement.values.mapNotNull { element ->
                runCatching { json.decodeFromJsonElement<SalesUnitDto>(element) }.getOrNull()
            }

            is JsonArray -> unitsElement.mapNotNull { element ->
                runCatching { json.decodeFromJsonElement<SalesUnitDto>(element) }.getOrNull()
            }

            else -> emptyList()
        }

        val stocks = snapshot["unit_stocks"]
            ?.let { element ->
                when (element) {
                    is JsonArray -> element.mapNotNull { item ->
                        runCatching { json.decodeFromJsonElement<UnitStockDto>(item) }.getOrNull()
                    }

                    else -> emptyList()
                }
            }
            .orEmpty()

        AbacoLog.step(
            LogCategory.POS,
            "RemoteWarehouseDataSource",
            "PDV resueltos desde /sync",
            "units=${units.size} ids=${units.map { it.id }}",
        )

        return SalesUnitsResponseDto(
            units = units,
            stocks = stocks,
        )
    }

    suspend fun getWarehouse(): WarehouseResponseDto {
        val response = http.get(url("/warehouse")) { bearerAuth(token()) }
        if (!response.status.isSuccess()) {
            error("No se pudo cargar stock de almacén (HTTP ${response.status.value})")
        }
        return response.body()
    }
}
