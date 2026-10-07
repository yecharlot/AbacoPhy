package com.elitec.com.feature.stats.ui.models

import com.elitec.com.feature.catalog.domain.entities.Product
import com.elitec.com.feature.pos.domain.entities.Sale
import com.elitec.com.feature.pos.domain.entities.effectiveLineTotal
import com.elitec.com.feature.pos.domain.entities.effectiveTotal
import com.elitec.com.feature.warehouse.domain.entities.SalesUnit
import com.elitec.com.feature.warehouse.domain.entities.UnitStock
import kotlinx.datetime.*

data class StatsRaw(
    val sales: List<Sale>,
    val products: List<Product>,
    val units: List<SalesUnit>,
    val stocks: List<UnitStock>,
)

// ═════════════════════════════════════════════════════════════════════
//  ADAPTADORES — único sitio que toca tus entidades
// ═════════════════════════════════════════════════════════════════════
private data class LineRow(val productId: String, val qty: Double, val amount: Double)
private data class SaleRow(
    val unitId: String,
    val unitName: String,
    val total: Double,
    val date: LocalDate,
    val lines: List<LineRow>,
)
private data class StockRow(val unitId: String, val productId: String, val qty: Double)
private data class ProductRow(val id: String, val name: String)
private data class UnitRow(val id: String, val name: String)

/** Ventas que cuentan para las estadísticas. Ajusta si tienes estados como anulada/cancelada. */
private fun Sale.counts(): Boolean = true
// Ejemplo: = !status.equals("cancelled", ignoreCase = true) && !status.equals("anulada", ignoreCase = true)

/**
 * `date` es String. Soporta "2026-10-07T14:30:00Z", con offset ("...-05:00")
 * y solo fecha ("2026-10-07"). Devuelve null si no se puede interpretar.
 */
private fun parseSaleDate(raw: String, tz: TimeZone): LocalDate? =
    runCatching { Instant.parse(raw).toLocalDateTime(tz).date }.getOrNull()
        ?: runCatching { LocalDate.parse(raw.trim().take(10)) }.getOrNull()

private fun Sale.toRow(tz: TimeZone): SaleRow? {
    if (!counts()) return null
    val day = parseSaleDate(date, tz) ?: return null   // venta con fecha ilegible: se omite
    return SaleRow(
        unitId = unitId,
        unitName = unitName,
        total = effectiveTotal(),
        date = day,
        lines = lines.map {
            LineRow(
                productId = it.productId,              // ← AJUSTA si SaleLine usa otro nombre
                qty = it.qty,
                amount = it.effectiveLineTotal(),
            )
        },
    )
}

private fun UnitStock.toRow() = StockRow(unitId, productId, qty)   // ← AJUSTA si difiere
private fun Product.toRow() = ProductRow(id, name)                 // ← AJUSTA si difiere
private fun SalesUnit.toRow() = UnitRow(id, name)                  // ← AJUSTA si difiere

// ═════════════════════════════════════════════════════════════════════
//  Cálculo (no depende de tus entidades)
// ═════════════════════════════════════════════════════════════════════
object StatsCalculator {
    private const val LOW_STOCK = 5.0

    fun compute(
        raw: StatsRaw,
        period: StatsPeriod,
        unitId: String?,
        now: Instant = kotlin.time.Clock.System.now(),
        tz: TimeZone = TimeZone.currentSystemDefault(),
    ): StatsUiState {
        val today: LocalDate = now.toLocalDateTime(tz).date

        val sales: List<SaleRow> = raw.sales.mapNotNull { it.toRow(tz) }
        val products: List<ProductRow> = raw.products.map { it.toRow() }
        val units: List<UnitRow> = raw.units.map { it.toRow() }
        val stocks: List<StockRow> = raw.stocks.map { it.toRow() }

        val days: Int? = period.days
        val start: LocalDate? = days?.let { today.minus(it - 1, DateTimeUnit.DAY) }

        val inPeriod: List<SaleRow> = sales.filter { start == null || it.date >= start }   // todos los PDV
        val scoped: List<SaleRow> = inPeriod.filter { unitId == null || it.unitId == unitId }

        val names: Map<String, String> = products.associate { it.id to it.name }
        val unitNames: Map<String, String> = units.associate { it.id to it.name }

        // ---- KPIs
        val revenue: Double = scoped.sumOf { it.total }
        val prevRevenue: Double = if (days != null && start != null) {
            val prevStart = start.minus(days, DateTimeUnit.DAY)
            sales
                .filter { (unitId == null || it.unitId == unitId) && it.date >= prevStart && it.date < start }
                .sumOf { it.total }
        } else 0.0

        val kpis = StatsKpis(
            revenue = revenue,
            salesCount = scoped.size,
            avgTicket = if (scoped.isEmpty()) 0.0 else revenue / scoped.size,
            itemsSold = scoped.sumOf { s -> s.lines.sumOf { l -> l.qty } },
            revenueDeltaPct = if (prevRevenue > 0.0) (revenue - prevRevenue) / prevRevenue * 100.0 else null,
        )

        // ---- Serie temporal (diaria hasta 31 días, semanal si es más largo, máx. 1 año)
        val first: LocalDate = start ?: scoped.minOfOrNull { it.date } ?: today
        val floor: LocalDate = today.minus(364, DateTimeUnit.DAY)
        val from: LocalDate = if (first < floor) floor else first
        val totalDays: Int = from.daysUntil(today) + 1
        val bucket: Int = if (totalDays > 31) 7 else 1
        val byDay: Map<LocalDate, Double> = scoped.groupBy { it.date }.mapValues { (_, v) -> v.sumOf { it.total } }

        val series: List<DailyRevenue> = (0 until totalDays step bucket).map { off ->
            val d0 = from.plus(off, DateTimeUnit.DAY)
            val sum: Double = (0 until bucket).sumOf { k -> byDay[d0.plus(k, DateTimeUnit.DAY)] ?: 0.0 }
            DailyRevenue(label = d0.shortLabel(), value = sum)
        }

        // ---- Top productos
        val top: List<RankedProduct> = scoped.flatMap { it.lines }
            .groupBy { it.productId }
            .map { (id, ls) ->
                RankedProduct(
                    name = names[id] ?: "Producto $id",
                    revenue = ls.sumOf { l -> l.amount },
                    qty = ls.sumOf { l -> l.qty },
                )
            }
            .sortedByDescending { it.revenue }
            .take(5)

        // ---- Reparto por PDV (compara todos, independiente del filtro de PDV)
        val shares: List<UnitShare> = inPeriod.groupBy { it.unitId }
            .map { (id, list) ->
                UnitShare(
                    name = unitNames[id] ?: list.first().unitName.ifBlank { id },
                    revenue = list.sumOf { it.total },
                    salesCount = list.size,
                )
            }
            .sortedByDescending { it.revenue }

        // ---- Stock bajo
        val alerts: List<StockAlert> = stocks
            .filter { (unitId == null || it.unitId == unitId) && it.qty <= LOW_STOCK }
            .sortedBy { it.qty }
            .take(6)
            .map {
                StockAlert(
                    productName = names[it.productId] ?: it.productId,
                    unitName = unitNames[it.unitId] ?: it.unitId,
                    qty = it.qty,
                    ratio = (it.qty / LOW_STOCK).toFloat().coerceIn(0f, 1f),
                )
            }

        return StatsUiState(
            isLoading = false,
            hasData = true,
            period = period,
            selectedUnitId = unitId,
            unitOptions = listOf(UnitOption(null, "Todos")) + units.map { UnitOption(it.id, it.name) },
            kpis = kpis,
            revenueByDay = series,
            topProducts = top,
            unitShares = shares,
            stockAlerts = alerts,
        )
    }

    /** "7/10", a partir de toString() ("2026-10-07") para no depender de la versión de kotlinx-datetime. */
    private fun LocalDate.shortLabel(): String {
        val s = toString()
        return "${s.substring(8, 10).toInt()}/${s.substring(5, 7).toInt()}"
    }
}