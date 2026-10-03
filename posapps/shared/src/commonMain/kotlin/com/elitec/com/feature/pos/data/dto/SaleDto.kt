package com.elitec.com.feature.pos.data.dto

import androidx.room3.Entity
import androidx.room3.PrimaryKey
import com.elitec.com.feature.pos.domain.entities.Sale
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * DTO de red + entidad Room.
 * Sin companion object — evita "Plugin generated duplicated companion object".
 */
@Entity(tableName = "pos_sales")
@Serializable
data class SaleDto(
    @PrimaryKey
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

fun SaleDto.toDomain(): Sale = Sale(
    id = id,
    number = number.orEmpty(),
    date = date.orEmpty(),
    unitId = unitId.orEmpty(),
    unitName = unitName.orEmpty(),
    seller = seller.orEmpty(),
    lines = lines.orEmpty().map { it.toDomain() },
    subtotal = subtotal ?: 0.0,
    discount = discount ?: 0.0,
    total = total ?: 0.0,
    costTotal = costTotal ?: 0.0,
    currency = currency.orEmpty(),
    status = status.orEmpty(),
    note = note.orEmpty(),
    metadata = metadata,
)

fun Sale.toDto(): SaleDto = SaleDto(
    id = id,
    number = number,
    date = date,
    unitId = unitId,
    unitName = unitName,
    seller = seller,
    lines = lines.map { it.toDto() },
    subtotal = subtotal,
    discount = discount,
    total = total,
    costTotal = costTotal,
    currency = currency,
    status = status,
    note = note,
    metadata = metadata,
)

@Serializable
data class SalesResponseDto(
    val sales: List<SaleDto>? = null,
)

@Serializable
data class SaleResponseDto(
    val sale: SaleDto? = null,
)
