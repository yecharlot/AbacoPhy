package com.elitec.com.feature.pos.ui.models

data class LocalStock(
    val productId: String,
    val posId: String,
    val productName: String,
    val qty: Double
)