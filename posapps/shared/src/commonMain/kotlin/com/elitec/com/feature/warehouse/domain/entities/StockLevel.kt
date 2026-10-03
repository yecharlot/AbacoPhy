package com.elitec.com.feature.warehouse.domain.entities

const val LOW_STOCK_THRESHOLD = 5.0

enum class StockLevel { OUT, LOW, OK }

data class StockLevelMeta(
    val level: StockLevel,
    val label: String,
)

fun stockLevel(qty: Double, lowThreshold: Double = LOW_STOCK_THRESHOLD): StockLevel = when {
    !qty.isFinite() || qty <= 0.0 -> StockLevel.OUT
    qty <= lowThreshold -> StockLevel.LOW
    else -> StockLevel.OK
}

fun stockLevelMeta(qty: Double, lowThreshold: Double = LOW_STOCK_THRESHOLD): StockLevelMeta =
    when (stockLevel(qty, lowThreshold)) {
        StockLevel.OUT -> StockLevelMeta(StockLevel.OUT, "Agotado")
        StockLevel.LOW -> StockLevelMeta(StockLevel.LOW, "Casi agotado")
        StockLevel.OK -> StockLevelMeta(StockLevel.OK, "Habilitado")
    }
