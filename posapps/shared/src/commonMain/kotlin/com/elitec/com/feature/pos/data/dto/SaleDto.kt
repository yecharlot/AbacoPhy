package com.elitec.com.feature.pos.data.dto

import androidx.room3.Entity
import androidx.room3.PrimaryKey
import com.elitec.com.feature.pos.domain.entities.Sale
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

private val saleJson = Json {
    ignoreUnknownKeys = true
    encodeDefaults = true
}

@Serializable
data class SaleNetworkDto(
    val id: String = "",
    val number: String? = null,
    val date: String? = null,
    @SerialName("unit_id") val unitId: String? = null,
    @SerialName("unit_name") val unitName: String? = null,
    val seller: String? = null,
    val lines: List<SaleLineDto>? = null,
    val subtotal: Double? = null,
    val discount: Double? = null,
    val total: Double? = null,
    @SerialName("cost_total") val costTotal: Double? = null,
    val currency: String? = null,
    val status: String? = null,
    val note: String? = null,
    val metadata: String? = null,
)

fun SaleNetworkDto.toEntity(): SaleDto = SaleDto(
    id = id,
    number = number,
    date = date,
    unitId = unitId,
    unitName = unitName,
    seller = seller,
    linesJson = saleJson.encodeToString(lines.orEmpty()),
    subtotal = subtotal,
    discount = discount,
    total = total,
    costTotal = costTotal,
    currency = currency,
    status = status,
    note = note,
    metadata = metadata,
)

fun SaleNetworkDto.toDomain(): Sale = toEntity().toDomain()

@Entity(tableName = "pos_sales")
data class SaleDto(
    @PrimaryKey val id: String = "",
    val number: String? = null,
    val date: String? = null,
    val unitId: String? = null,
    val unitName: String? = null,
    val seller: String? = null,
    val linesJson: String = "[]",
    val subtotal: Double? = null,
    val discount: Double? = null,
    val total: Double? = null,
    val costTotal: Double? = null,
    val currency: String? = null,
    val status: String? = null,
    val note: String? = null,
    val metadata: String? = null,
)

fun SaleDto.toDomain(): Sale {
    val lines = runCatching {
        saleJson.decodeFromString<List<SaleLineDto>>(linesJson)
    }.getOrDefault(emptyList())
    return Sale(
        id = id,
        number = number.orEmpty(),
        date = date.orEmpty(),
        unitId = unitId.orEmpty(),
        unitName = unitName.orEmpty(),
        seller = seller.orEmpty(),
        lines = lines.map { it.toDomain() },
        subtotal = subtotal ?: 0.0,
        discount = discount ?: 0.0,
        total = total ?: 0.0,
        costTotal = costTotal ?: 0.0,
        currency = currency.orEmpty(),
        status = status.orEmpty(),
        note = note.orEmpty(),
        metadata = metadata,
    )
}

@Serializable
data class SalesResponseDto(
    val sales: List<SaleNetworkDto>? = null,
)

@Serializable
data class SaleResponseDto(
    val sale: SaleNetworkDto? = null,
)
