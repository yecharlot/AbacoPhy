package com.elitec.com.feature.pos.domain.entities

data class CreateSaleLineInput (
    val productId: String,
    val qty: Double,
    val unitPrice: Double,
    val discountPct: Double,
    /** JSON string opaco; ausente si el API no lo envía. */
    val metadata: String? = null
)