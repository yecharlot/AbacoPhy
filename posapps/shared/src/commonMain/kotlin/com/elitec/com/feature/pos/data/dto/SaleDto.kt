package com.elitec.com.feature.pos.data.dto

import androidx.room3.Entity
import androidx.room3.PrimaryKey
import com.elitec.com.feature.pos.data.dto.SaleLineDto.Companion.toData
import com.elitec.com.feature.pos.data.dto.SaleLineDto.Companion.toDomain
import com.elitec.com.feature.pos.domain.entities.Sale
import kotlinx.serialization.Serializable

@Entity
@Serializable
data class SaleDto (
    @PrimaryKey val id: String,
    val number: Double?,
    val date: String?,
    val unit_id: String?,
    val unit_name: String?,
    val seller: String?,
    val lines: List<SaleLineDto>?,
    val sub_total: Double?,
    val discount: Double?,
    val total: Double?,
    val cost_total: Double?,
    val currency: String?,
    val status: String?,
    val note: String?,
    /** JSON string opaco; ausente si el API no lo envía. */
    val metadata: String? = null
) {
    companion object {
        fun SaleDto.toDomain(): Sale {
            return Sale(
                id = this.id,
                number = this.number ?: 0.0,
                date= this.date ?: "",
                unitId = this.unit_id ?: "",
                unitName = this.unit_name ?: "",
                seller = this.seller ?: "",
                lines = this.lines?.map { it.toDomain() } ?: emptyList(),
                subTotal = this.sub_total ?: 0.0,
                discount = this.discount ?: 0.0,
                total = this.total ?: 0.0,
                costTotal = this.cost_total ?: 0.0,
                currency = this.currency ?: "CUP",
                status = this.status ?: "",
                note = this.note ?: "",
                metadata = this.metadata,
            )
        }

        fun Sale.toData(): SaleDto {
            return SaleDto(
                id = this.id,
                number = this.number,
                unit_id = this.unitId,
                unit_name = this.unitName,
                seller = this.seller,
                lines = this.lines.map { it.toData() },
                sub_total = this.subTotal,
                discount = this.discount,
                total = this.total,
                cost_total = this.costTotal,
                currency = this.currency,
                status = this.status,
                note = this.note,
                date = this.date,
                metadata = this.metadata,
            )
        }
    }
}

@Serializable
data class SalesResponseDto (
    val sales: List<SaleDto>?
)

@Serializable
data class SaleResponseDto (
    val sale: SaleDto?
)