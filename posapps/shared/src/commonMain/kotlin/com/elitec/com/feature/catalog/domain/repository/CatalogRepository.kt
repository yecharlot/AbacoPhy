package com.elitec.com.feature.catalog.domain.repository

import com.elitec.com.feature.catalog.domain.entities.Product
import kotlinx.coroutines.flow.Flow

/**
 * Contrato mínimo que POS necesita del catálogo.
 * Escritura (create/update) queda fuera del alcance de la app vendedor.
 */
interface CatalogRepository {
    suspend fun getProducts(): List<Product>
    suspend fun getProductById(id: String): Product?
    /** Cache local reactivo (ventaja KMP / offline). */
    fun observeProducts(): Flow<List<Product>>
}
