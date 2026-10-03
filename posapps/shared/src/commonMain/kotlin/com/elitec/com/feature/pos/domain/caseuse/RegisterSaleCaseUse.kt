package com.elitec.com.feature.pos.domain.caseuse

import com.elitec.com.feature.pos.domain.entities.CreateSaleInput
import com.elitec.com.feature.pos.domain.entities.Sale
import com.elitec.com.feature.pos.domain.repository.SalesRepository

/**
 * Valida el ticket antes de enviarlo (misma regla que web RegisterSale).
 * Totales, costo e ingreso contable los resuelve el backend.
 */
class RegisterSaleCaseUse(
    private val repository: SalesRepository,
) {
    suspend operator fun invoke(input: CreateSaleInput): Result<Sale> = runCatching {
        if (input.lines.isEmpty()) {
            error("La venta necesita al menos una línea")
        }
        for (line in input.lines) {
            if (line.productId.isBlank()) {
                error("Cada línea necesita un producto")
            }
            if (line.qty <= 0.0) {
                error("La cantidad debe ser mayor que cero")
            }
            line.unitPrice?.let {
                if (it < 0.0) error("El precio no puede ser negativo")
            }
            line.discountPct?.let {
                if (it < 0.0 || it > 100.0) error("La rebaja debe estar entre 0 y 100 %")
            }
        }
        repository.createSale(input)
    }
}
