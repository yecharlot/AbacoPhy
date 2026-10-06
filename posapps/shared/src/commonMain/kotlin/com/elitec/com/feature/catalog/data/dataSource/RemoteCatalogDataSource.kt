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
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/**
 * Catálogo POS.
 * Vendedor suele recibir 403 en /products → fallback /sync.
 * Precios de venta: product.price_sale y, si falta, fichas de precio
 * (snapshot.price_sheets o GET /price-sheets).
 */
class RemoteCatalogDataSource(
    private val http: HttpClient,
    private val baseUrl: String,
    private val tokenProvider: suspend () -> String?,
) {
    private val endpoint get() = baseUrl.trimEnd('/') + "/products"
    private val priceSheetsEndpoint get() = baseUrl.trimEnd('/') + "/price-sheets"
    private val syncEndpoint get() = baseUrl.trimEnd('/') + "/sync"
    private val json = Json { ignoreUnknownKeys = true; isLenient = true }

    init {
        require(baseUrl.isNotBlank()) { "apiBaseUrl vacío" }
    }

    suspend fun listProducts(): List<ProductDto> {
        val token = tokenProvider() ?: error("No hay sesión activa")
        val response = http.get(endpoint) { bearerAuth(token) }

        val base = if (response.status.isSuccess()) {
            response.body<ProductsResponseDto>().products.orEmpty()
        } else {
            AbacoLog.apiResponse(
                "GET",
                endpoint,
                response.status.value,
                "fallback a /sync para resolver catálogo de productos",
            )
            listProductsFromSync(token)
        }

        val prices = loadPriceByProductId(token)
        val merged = mergeSalePrices(base, prices)

        val withPrice = merged.count { (it.priceSale ?: 0.0) > 0.0 }
        AbacoLog.step(
            LogCategory.POS,
            "RemoteCatalogDataSource",
            "precios de venta resueltos",
            "products=${merged.size} withPrice=$withPrice priceSheetKeys=${prices.size}",
        )

        return merged
    }

    private suspend fun listProductsFromSync(token: String): List<ProductDto> {
        val response = http.get(syncEndpoint) { bearerAuth(token) }
        if (!response.status.isSuccess()) {
            error("No se pudieron cargar productos desde /sync (HTTP ${response.status.value})")
        }
        val root = response.body<JsonObject>()
        val snapshot = root["snapshot"]?.jsonObject
            ?: error("Respuesta /sync sin snapshot")

        val productsElement = snapshot["products"]
            ?: error("Respuesta /sync sin products")

        val products = when (productsElement) {
            is JsonObject -> productsElement.values.mapNotNull { element ->
                runCatching { json.decodeFromJsonElement<ProductDto>(element) }.getOrNull()
            }
            is JsonArray -> productsElement.mapNotNull { element ->
                runCatching { json.decodeFromJsonElement<ProductDto>(element) }.getOrNull()
            }
            else -> emptyList()
        }

        AbacoLog.step(
            LogCategory.POS,
            "RemoteCatalogDataSource",
            "productos resueltos desde /sync",
            "products=${products.size} ids=${products.map { it.id }}",
        )
        return products
    }

    /**
     * productId → precio de venta desde fichas.
     * Preferimos la ficha con mayor UpdatedAt implícito (última en mapa).
     */
    private suspend fun loadPriceByProductId(token: String): Map<String, Double> {
        val fromApi = runCatching { fetchPriceSheetsApi(token) }.getOrDefault(emptyMap())
        if (fromApi.isNotEmpty()) return fromApi
        return runCatching { fetchPriceSheetsFromSync(token) }.getOrDefault(emptyMap())
    }

    private suspend fun fetchPriceSheetsApi(token: String): Map<String, Double> {
        val response = http.get(priceSheetsEndpoint) { bearerAuth(token) }
        if (!response.status.isSuccess()) {
            AbacoLog.apiResponse(
                "GET",
                priceSheetsEndpoint,
                response.status.value,
                "sin fichas de precio por API",
            )
            return emptyMap()
        }
        val root = response.body<JsonObject>()
        val sheets = root["sheets"] as? JsonArray ?: return emptyMap()
        return parseSheetsArray(sheets)
    }

    private suspend fun fetchPriceSheetsFromSync(token: String): Map<String, Double> {
        val response = http.get(syncEndpoint) { bearerAuth(token) }
        if (!response.status.isSuccess()) return emptyMap()
        val root = response.body<JsonObject>()
        val snapshot = root["snapshot"]?.jsonObject ?: return emptyMap()
        val sheetsEl = snapshot["price_sheets"] ?: return emptyMap()
        return when (sheetsEl) {
            is JsonObject -> {
                val out = mutableMapOf<String, Double>()
                for (el in sheetsEl.values) {
                    val obj = el as? JsonObject ?: continue
                    putSheet(out, obj)
                }
                out
            }
            is JsonArray -> parseSheetsArray(sheetsEl)
            else -> emptyMap()
        }
    }

    private fun parseSheetsArray(sheets: JsonArray): Map<String, Double> {
        val out = mutableMapOf<String, Double>()
        for (el in sheets) {
            val obj = el as? JsonObject ?: continue
            putSheet(out, obj)
        }
        return out
    }

    private fun putSheet(out: MutableMap<String, Double>, obj: JsonObject) {
        val productId = obj["product_id"]?.jsonPrimitive?.contentOrNull
            ?: obj["productId"]?.jsonPrimitive?.contentOrNull
            ?: return
        val price = (obj["price"] as? JsonPrimitive)?.doubleOrNull
            ?: (obj["price"] as? JsonPrimitive)?.contentOrNull?.toDoubleOrNull()
            ?: return
        if (price > 0.0) out[productId] = price
    }

    private fun mergeSalePrices(
        products: List<ProductDto>,
        priceByProduct: Map<String, Double>,
    ): List<ProductDto> {
        if (priceByProduct.isEmpty()) return products
        return products.map { p ->
            val current = p.priceSale ?: 0.0
            if (current > 0.0) return@map p
            val sheet = priceByProduct[p.id] ?: return@map p
            p.copy(priceSale = sheet)
        }
    }
}
