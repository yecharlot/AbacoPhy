package com.elitec.com.feature.catalog.data.dataSource

import com.elitec.com.feature.catalog.data.dto.ProductDto
import com.elitec.com.feature.catalog.data.dto.ProductsResponseDto
import com.elitec.com.infraestructure.logging.AbacoLog
import com.elitec.com.infraestructure.logging.LogCategory
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
 * GET {baseUrl}/products — alineado con web CatalogRemoteSource.
 *
 * Si /products no está autorizado para el usuario operativo, usamos el
 * snapshot completo de /sync, igual que el flujo de PDV. /sync expone
 * snapshot.products como mapa y contiene los mismos datos de nomenclador.
 */
class RemoteCatalogDataSource(
    private val http: HttpClient,
    private val baseUrl: String,
    private val tokenProvider: suspend () -> String?,
) {
    private val endpoint get() = baseUrl.trimEnd('/') + "/products"
    private val json = Json { ignoreUnknownKeys = true }

    init {
        require(baseUrl.isNotBlank()) { "apiBaseUrl vacío" }
    }

    suspend fun listProducts(): List<ProductDto> {
        val token = tokenProvider() ?: error("No hay sesión activa")
        val response = http.get(endpoint) { bearerAuth(token) }

        if (response.status.isSuccess()) {
            return response.body<ProductsResponseDto>().products.orEmpty()
        }

        AbacoLog.apiResponse(
            "GET",
            endpoint,
            response.status.value,
            "fallback a /sync para resolver catálogo de productos",
        )

        return listProductsFromSync(token)
    }

    private suspend fun listProductsFromSync(token: String): List<ProductDto> {
        val syncEndpoint = baseUrl.trimEnd('/') + "/sync"
        val response = http.get(syncEndpoint) { bearerAuth(token) }

        if (!response.status.isSuccess()) {
            error(
                "No se pudieron cargar productos desde /sync " +
                    "(HTTP ${'$'}{response.status.value})",
            )
        }

        val root = response.body<JsonObject>()
        val snapshot = root["snapshot"]?.jsonObject
            ?: error("Respuesta /sync sin snapshot")

        val productsElement = snapshot["products"]
            ?: error("Respuesta /sync sin products")

        val products = when (productsElement) {
            is JsonObject -> productsElement.values.mapNotNull { element ->
                runCatching {
                    json.decodeFromJsonElement<ProductDto>(element)
                }.getOrNull()
            }

            is JsonArray -> productsElement.mapNotNull { element ->
                runCatching {
                    json.decodeFromJsonElement<ProductDto>(element)
                }.getOrNull()
            }

            else -> emptyList()
        }

        AbacoLog.step(
            LogCategory.POS,
            "RemoteCatalogDataSource",
            "productos resueltos desde /sync",
            "products=${'$'}{products.size} ids=${'$'}{products.map { it.id }}",
        )

        return products
    }
}
