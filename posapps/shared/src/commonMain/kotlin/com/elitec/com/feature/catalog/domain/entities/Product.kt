package com.elitec.com.feature.catalog.domain.entities

/**
 * Nomenclador de producto (solo lectura operativa en POS).
 * costStd/priceSale pueden venir del API legacy; el nomenclador web ya no los edita.
 */
data class Product(
    val id: String,
    val code: String,
    val name: String,
    val unit: String,
    val category: String,
    val costStd: Double? = null,
    val priceSale: Double? = null,
    val metadata: String? = null,
)
