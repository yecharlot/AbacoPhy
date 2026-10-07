package com.elitec.com.feature.stats.ui.models

enum class StatsPeriod(val days: Int?, val label: String) {
    WEEK(7, "7d"), MONTH(30, "30d"), QUARTER(90, "90d"), ALL(null, "Todo")
}

data class UnitOption(val id: String?, val name: String) // id == null -> todos

data class StatsKpis(
    val revenue: Double = 0.0,
    val salesCount: Int = 0,
    val avgTicket: Double = 0.0,
    val itemsSold: Double = 0.0,
    val revenueDeltaPct: Double? = null, // vs periodo anterior equivalente
)

data class DailyRevenue(val label: String, val value: Double)
data class RankedProduct(val name: String, val revenue: Double, val qty: Double)
data class UnitShare(val name: String, val revenue: Double, val salesCount: Int)
data class StockAlert(val productName: String, val unitName: String, val qty: Double, val ratio: Float)

data class StatsUiState(
    val isLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val hasData: Boolean = false,
    val error: String? = null,
    val period: StatsPeriod = StatsPeriod.MONTH,
    val selectedUnitId: String? = null,
    val unitOptions: List<UnitOption> = listOf(UnitOption(null, "Todos")),
    val kpis: StatsKpis = StatsKpis(),
    val revenueByDay: List<DailyRevenue> = emptyList(),
    val topProducts: List<RankedProduct> = emptyList(),
    val unitShares: List<UnitShare> = emptyList(),
    val stockAlerts: List<StockAlert> = emptyList(),
)

sealed interface StatsEvent {
    data class PeriodChanged(val period: StatsPeriod) : StatsEvent
    data class UnitChanged(val unitId: String?) : StatsEvent
    data object Refresh : StatsEvent
    data object DismissError : StatsEvent
}