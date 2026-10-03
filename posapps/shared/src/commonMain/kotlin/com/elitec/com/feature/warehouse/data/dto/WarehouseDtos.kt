package com.elitec.com.feature.warehouse.data.dto

import androidx.room3.Entity
import androidx.room3.PrimaryKey
import com.elitec.com.feature.warehouse.domain.entities.SalesUnit
import com.elitec.com.feature.warehouse.domain.entities.UnitStock
import com.elitec.com.feature.warehouse.domain.entities.WarehouseStockRow
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class SalesUnitDto(
    val id: String = "",
    val code: String? = null,
    val name: String? = null,
    val address: String? = null,
    val phone: String? = null,
    val active: Boolean? = true,
    val metadata: String? = null,
)

fun SalesUnitDto.toDomain(): SalesUnit = SalesUnit(
    id = id,
    code = code.orEmpty(),
    name = name.orEmpty(),
    address = address.orEmpty(),
    phone = phone.orEmpty(),
    active = active != false,
    metadata = metadata,
)

@Entity(tableName = "sales_units")
data class SalesUnitEntity(
    @PrimaryKey val id: String = "",
    val code: String? = null,
    val name: String? = null,
    val address: String? = null,
    val phone: String? = null,
    val active: Boolean? = true,
    val metadata: String? = null,
)

fun SalesUnitEntity.toDomain(): SalesUnit = SalesUnit(
    id = id,
    code = code.orEmpty(),
    name = name.orEmpty(),
    address = address.orEmpty(),
    phone = phone.orEmpty(),
    active = active != false,
    metadata = metadata,
)

fun SalesUnitDto.toEntity(): SalesUnitEntity = SalesUnitEntity(
    id = id,
    code = code,
    name = name,
    address = address,
    phone = phone,
    active = active,
    metadata = metadata,
)

@Serializable
data class UnitStockDto(
    @SerialName("unit_id") val unitId: String = "",
    @SerialName("product_id") val productId: String = "",
    val qty: Double? = null,
    @SerialName("avg_cost") val avgCost: Double? = null,
    @SerialName("amount_base") val amountBase: Double? = null,
    val metadata: String? = null,
)

fun UnitStockDto.toDomain(): UnitStock = UnitStock(
    unitId = unitId,
    productId = productId,
    qty = qty ?: 0.0,
    avgCost = avgCost ?: 0.0,
    amountBase = amountBase ?: 0.0,
    metadata = metadata,
)

@Entity(tableName = "unit_stocks")
data class UnitStockEntity(
    @PrimaryKey val rowKey: String = "",
    val unitId: String = "",
    val productId: String = "",
    val qty: Double = 0.0,
    val avgCost: Double = 0.0,
    val amountBase: Double = 0.0,
    val metadata: String? = null,
)

fun UnitStockEntity.toDomain(): UnitStock = UnitStock(
    unitId = unitId,
    productId = productId,
    qty = qty,
    avgCost = avgCost,
    amountBase = amountBase,
    metadata = metadata,
)

fun UnitStockDto.toEntity(): UnitStockEntity = UnitStockEntity(
    rowKey = "$unitId::$productId",
    unitId = unitId,
    productId = productId,
    qty = qty ?: 0.0,
    avgCost = avgCost ?: 0.0,
    amountBase = amountBase ?: 0.0,
    metadata = metadata,
)

@Serializable
data class WarehouseRowDto(
    @SerialName("product_id") val productId: String = "",
    val code: String? = null,
    val name: String? = null,
    val unit: String? = null,
    val qty: Double? = null,
    @SerialName("avg_cost") val avgCost: Double? = null,
    @SerialName("amount_base") val amountBase: Double? = null,
    val currency: String? = null,
)

fun WarehouseRowDto.toDomain(): WarehouseStockRow = WarehouseStockRow(
    productId = productId,
    code = code.orEmpty(),
    name = name.orEmpty(),
    unit = unit.orEmpty(),
    qty = qty ?: 0.0,
    avgCost = avgCost ?: 0.0,
    amountBase = amountBase ?: 0.0,
    currency = currency.orEmpty(),
)

@Serializable
data class SalesUnitsResponseDto(
    val units: List<SalesUnitDto>? = null,
    val stocks: List<UnitStockDto>? = null,
)

@Serializable
data class WarehouseResponseDto(
    val warehouse: List<WarehouseRowDto>? = null,
    @SerialName("unit_stocks") val unitStocks: List<UnitStockDto>? = null,
)
