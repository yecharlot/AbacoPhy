package com.elitec.com.feature.pos.data.dataSource

import com.elitec.com.feature.pos.data.dto.SaleDto
import com.elitec.com.feature.pos.data.dto.SaleResponseDto
import com.elitec.com.feature.pos.data.dto.SalesResponseDto
import com.elitec.com.feature.pos.data.dto.toEntity
import com.elitec.com.feature.pos.data.mappers.SaleMapper
import com.elitec.com.feature.pos.domain.entities.CreateSaleInput
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.bearerAuth
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.http.isSuccess

/**
 * Fuente remota alineada con web:
 *   GET  {baseUrl}/pos/sales
 *   POST {baseUrl}/pos/sales
 *
 * Devuelve [SaleDto] entidad Room (linesJson), lista para cache local.
 */
class RemoteSalesDataSource(
    private val http: HttpClient,
    private val baseUrl: String,
    private val tokenProvider: suspend () -> String?,
) {
    private val endpoint: String
        get() = baseUrl.trimEnd('/') + "/pos/sales"

    init {
        require(baseUrl.isNotBlank()) {
            "La URL base de la API no está configurada (baseUrl vacío)"
        }
    }

    private suspend fun authToken(): String =
        tokenProvider() ?: error("No hay sesión activa (token ausente)")

    suspend fun listSales(): List<SaleDto> {
        val response: HttpResponse = http.get(endpoint) {
            bearerAuth(authToken())
        }
        if (!response.status.isSuccess()) {
            error("No se pudo listar ventas (HTTP ${response.status.value})")
        }
        val body = response.body<SalesResponseDto>()
        return body.sales.orEmpty().map { it.toEntity() }
    }

    suspend fun createSale(input: CreateSaleInput): SaleDto {
        val response: HttpResponse = http.post(endpoint) {
            bearerAuth(authToken())
            contentType(ContentType.Application.Json)
            setBody(SaleMapper.createSaleInputToMap(input))
        }
        if (!response.status.isSuccess()) {
            val detail = runCatching { response.body<Map<String, String>>()["error"] }.getOrNull()
            error(detail ?: "No se pudo registrar la venta (HTTP ${response.status.value})")
        }
        val body = response.body<SaleResponseDto>()
        val network = body.sale ?: error("Respuesta de venta vacía")
        return network.toEntity()
    }

    suspend fun getById(saleId: String): SaleDto? =
        listSales().firstOrNull { it.id == saleId }
}
