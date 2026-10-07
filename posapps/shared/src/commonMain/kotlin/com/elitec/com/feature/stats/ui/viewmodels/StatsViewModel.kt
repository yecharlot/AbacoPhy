package com.elitec.com.feature.stats.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.elitec.com.feature.pos.domain.caseuse.LoadPosSnapshotCaseUse
import com.elitec.com.feature.pos.domain.caseuse.ObserveSalesFlowCaseUse
import com.elitec.com.feature.stats.ui.models.StatsCalculator
import com.elitec.com.feature.stats.ui.models.StatsEvent
import com.elitec.com.feature.stats.ui.models.StatsPeriod
import com.elitec.com.feature.stats.ui.models.StatsRaw
import com.elitec.com.feature.stats.ui.models.StatsUiState
import com.elitec.com.feature.warehouse.domain.caseuse.ObserveUnitStocksCaseUse
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class StatsViewModel(
    private val loadPosSnapshot: LoadPosSnapshotCaseUse,
    private val observeSales: ObserveSalesFlowCaseUse,
    private val observeUnitStocks: ObserveUnitStocksCaseUse,
) : ViewModel() {

    private data class Filters(val period: StatsPeriod = StatsPeriod.MONTH, val unitId: String? = null)
    private data class Status(val isRefreshing: Boolean = false, val error: String? = null)

    private val raw = MutableStateFlow<StatsRaw?>(null)
    private val filters = MutableStateFlow(Filters())
    private val status = MutableStateFlow(Status())

    val uiState: StateFlow<StatsUiState> = combine(raw, filters, status) { r, f, s ->
        val base = r?.let { StatsCalculator.compute(it, f.period, f.unitId) }
            ?: StatsUiState(period = f.period, selectedUnitId = f.unitId)
        base.copy(
            isLoading = r == null && s.error == null,
            hasData = r != null,
            isRefreshing = s.isRefreshing,
            error = s.error,
        )
    }
        .flowOn(Dispatchers.Default)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), StatsUiState())

    init {
        load()
        observeSales()
            .catch { /* el snapshot sigue siendo válido */ }
            .onEach { sales -> raw.update { it?.copy(sales = sales) } }
            .launchIn(viewModelScope)

        observeUnitStocks(null)
            .catch { }
            .onEach { stocks -> raw.update { it?.copy(stocks = stocks) } }
            .launchIn(viewModelScope)
    }

    fun onEvent(event: StatsEvent) {
        when (event) {
            is StatsEvent.PeriodChanged -> filters.update { it.copy(period = event.period) }
            is StatsEvent.UnitChanged -> filters.update { it.copy(unitId = event.unitId) }
            StatsEvent.Refresh -> load()
            StatsEvent.DismissError -> status.update { it.copy(error = null) }
        }
    }

    private fun load() = viewModelScope.launch {
        status.update { Status(isRefreshing = raw.value != null, error = null) }
        loadPosSnapshot(unitId = null)
            .onSuccess { snap ->
                raw.value = StatsRaw(snap.sales, snap.products, snap.units, snap.unitStocks)
            }
            .onFailure { e ->
                status.update { it.copy(error = e.message ?: "No se pudieron cargar las estadísticas") }
            }
        status.update { it.copy(isRefreshing = false) }
    }
}