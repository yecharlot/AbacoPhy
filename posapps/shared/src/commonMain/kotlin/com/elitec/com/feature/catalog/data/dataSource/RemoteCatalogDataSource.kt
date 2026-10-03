package com.elitec.com.feature.catalog.data.dataSource

import com.elitec.com.feature.catalog.data.dto.ProductDto
import com.elitec.com.feature.catalog.data.dto.ProductsResponseDto
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.bearerAuth
import io.ktor.client.request.get
import io.ktor.http.isSuccess

/** GET {baseUrl}/products — alineado con web CatalogRemoteSource. */
class RemoteCatalogDataSource(
    private val http: HttpClient,
    private val baseUrl: String,
    private val tokenProvider: suspend () -> String?,
) {
    private val endpoint get() = baseUrl.trimEnd('/') + "/products"

    init {
        require(baseUrl.isNotBlank()) { "apiBaseUrl vacío" }
    }

    suspend fun listProducts(): List<ProductDto> {
        val token = tokenProvider() ?: error("No hay sesión activa")
        val response = http.get(endpoint) { bearerAuth(token) }
        if (!response.status.isSuccess()) {
            error("No se pudieron cargar productos (HTTP ${response.status.value})")
        }
        return response.body<ProductsResponseDto>().products.orEmpty()
    }
}
