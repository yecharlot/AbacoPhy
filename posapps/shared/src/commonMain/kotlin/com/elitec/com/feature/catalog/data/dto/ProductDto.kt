package com.elitec.com.feature.catalog.data.dto

import androidx.room3.Entity
import androidx.room3.PrimaryKey
import com.elitec.com.feature.catalog.domain.entities.Product
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Entity(tableName = "catalog_products")
@Serializable
data class ProductDto(
    @PrimaryKey val id: String = "",
    val code: String? = null,
    val name: String? = null,
    val unit: String? = null,
    val category: String? = null,
    @SerialName("cost_std") val costStd: Double? = null,
    @SerialName("price_sale") val priceSale: Double? = null,
    val metadata: String? = null,
)

fun ProductDto.toDomain(): Product = Product(
    id = id,
    code = code.orEmpty(),
    name = name.orEmpty(),
    unit = unit.orEmpty(),
    category = category.orEmpty(),
    costStd = costStd,
    priceSale = priceSale,
    metadata = metadata,
)

@Serializable
data class ProductsResponseDto(
    val products: List<ProductDto>? = null,
)
