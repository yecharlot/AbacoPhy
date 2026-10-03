package com.elitec.com.feature.pos.domain.entities

/**
 * Línea de ticket a enviar al API. Solo productId + qty son obligatorios;
 * precio y descuento son opcionales (el server usa priceSale del producto si faltan).
 */
data class CreateSaleLineInput(
    val productId: String,
    val qty: Double,
    val unitPrice: Double? = null,
    val discountPct: Double? = null,
    /** JSON string opaco; ausente si el API no lo envía. */
    val metadata: String? = null,
)
