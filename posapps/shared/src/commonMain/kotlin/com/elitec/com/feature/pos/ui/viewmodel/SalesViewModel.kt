package com.elitec.com.feature.pos.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.elitec.com.feature.catalog.domain.entities.Product
import com.elitec.com.feature.catalog.domain.entities.effectiveUnitPrice
import com.elitec.com.feature.identity.domain.entities.Session
import com.elitec.com.feature.identity.domain.entities.SessionControl
import com.elitec.com.feature.identity.domain.repository.SessionRepository
import com.elitec.com.feature.pos.domain.caseuse.GetSaleByIdCaseUse
import com.elitec.com.feature.pos.domain.caseuse.ListSalesByPOSCaseUse
import com.elitec.com.feature.pos.domain.caseuse.LoadPosSnapshotCaseUse
import com.elitec.com.feature.pos.domain.caseuse.ObserveSalesFlowCaseUse
import com.elitec.com.feature.pos.domain.caseuse.RegisterSaleCaseUse
import com.elitec.com.feature.pos.domain.entities.CreateSaleInput
import com.elitec.com.feature.pos.domain.entities.Sale
import com.elitec.com.feature.pos.ui.components.AssignedUnitUiState
import com.elitec.com.feature.pos.ui.models.LocalStock
import com.elitec.com.feature.pos.ui.uiStates.RegisterSaleUiState
import com.elitec.com.feature.pos.ui.uiStates.SaleListUiState
import com.elitec.com.feature.warehouse.domain.entities.SalesUnit
import com.elitec.com.feature.warehouse.domain.entities.UnitStock
import com.elitec.com.infraestructure.logging.AbacoLog
import com.elitec.com.infraestructure.logging.LogCategory
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.launch

data class PosContextState(
    val products: List<Product> = emptyList(),
    val units: List<SalesUnit> = emptyList(),
    val unitStocks: List<UnitStock> = emptyList(),
    val loading: Boolean = false,
    val error: String? = null,
)

class SalesViewModel(
    private val observeSales: ObserveSalesFlowCaseUse,
    private val listSalesByPos: ListSalesByPOSCaseUse,
    private val registerSale: RegisterSaleCaseUse,
    private val getSaleById: GetSaleByIdCaseUse,
    private val loadPosSnapshot: LoadPosSnapshotCaseUse,
    private val sessions: SessionRepository,
) : ViewModel() {

    private val _salesUiState = MutableStateFlow<SaleListUiState>(SaleListUiState.Loading)
    val salesUiState: StateFlow<SaleListUiState> = _salesUiState.asStateFlow()

    private val _registerState = MutableStateFlow<RegisterSaleUiState>(RegisterSaleUiState.Idle)
    val registerState: StateFlow<RegisterSaleUiState> = _registerState.asStateFlow()

    private val _context = MutableStateFlow(PosContextState())
    val context: StateFlow<PosContextState> = _context.asStateFlow()

    private val _activeUnitId = MutableStateFlow("")
    val activeUnitId: StateFlow<String> = _activeUnitId.asStateFlow()

    private val _assignedUnit =
        MutableStateFlow<AssignedUnitUiState>(AssignedUnitUiState.Idle)
    val assignedUnit: StateFlow<AssignedUnitUiState> = _assignedUnit.asStateFlow()

    private val _sellerKey = MutableStateFlow("")
    val sellerKey: StateFlow<String> = _sellerKey.asStateFlow()

    init {
        observeLocalCache()
        observeAuthenticatedSession()
    }

    /**
     * El PDV del vendedor sale de la sesión autenticada:
     *
     * usuario.id
     *   -> Employee.metadata.userId
     *   -> Employee.metadata.unitIds
     *   -> user.metadata de /auth/login o /auth/me
     *   -> User.assignedUnitIds()
     *
     * No se consulta /payroll/employees desde el POS.
     */
    private fun observeAuthenticatedSession() {
        viewModelScope.launch {
            sessions.sessionState.collect { state ->
                when (state) {
                    SessionControl.Reading -> {
                        _assignedUnit.value = AssignedUnitUiState.Loading
                    }

                    SessionControl.NoSession -> {
                        _sellerKey.value = ""
                        _activeUnitId.value = ""
                        _assignedUnit.value = AssignedUnitUiState.None
                    }

                    is SessionControl.Active -> {
                        val user = state.session.user
                        AbacoLog.step(
                            LogCategory.POS,
                            "SalesViewModel",
                            "session Active",
                            "userId=${user.id} username=${user.username} metadata=${user.metadata} unitIds=${user.assignedUnitIds()}",
                        )
                        applySession(state.session, refresh = true)
                    }
                }
            }
        }
    }

    /**
     * Permite que MainScreen sincronice explícitamente la sesión que ya recibió
     * del árbol de navegación. Es idempotente y no crea una segunda fuente de
     * verdad: SessionRepository sigue siendo la fuente reactiva principal.
     */
    fun bindSession(session: Session) {
        applySession(session, refresh = _activeUnitId.value != session.user.assignedUnitIds().firstOrNull().orEmpty())
    }

    private fun applySession(session: Session, refresh: Boolean) {
        val user = session.user
        val assignedIds = user.assignedUnitIds()
        val assignedId = assignedIds.firstOrNull().orEmpty()

        AbacoLog.step(
            LogCategory.POS,
            "SalesViewModel",
            "resolve assigned POS",
            "userId=${user.id} assignedUnitIds=$assignedIds selected=$assignedId",
        )

        _sellerKey.value = user.displayName.ifBlank { user.username }

        if (assignedId.isBlank()) {
            AbacoLog.w(
                LogCategory.POS,
                "Usuario autenticado sin unitIds; no se puede resolver el punto de venta",
            )
            _activeUnitId.value = ""
            _assignedUnit.value = AssignedUnitUiState.None
            if (refresh) refreshAll()
            return
        }

        _assignedUnit.value = AssignedUnitUiState.Loading

        val changed = _activeUnitId.value != assignedId
        _activeUnitId.value = assignedId

        if (refresh || changed) {
            refreshAll()
        } else {
            updateAssignedUnitState()
        }
    }

    fun setActiveUnitId(unitId: String) {
        // Se conserva por compatibilidad con otras pantallas, pero el flujo
        // normal del vendedor usa el ID proveniente de la sesión.
        _activeUnitId.value = unitId
        refreshAll()
    }

    private fun observeLocalCache() {
        viewModelScope.launch {
            observeSales()
                .catch { e ->
                    _salesUiState.value =
                        SaleListUiState.Error(e.message ?: "Error observando ventas")
                }
                .collect { list ->
                    val unitId = _activeUnitId.value
                    val filtered =
                        if (unitId.isBlank()) emptyList()
                        else list.filter { it.unitId == unitId }

                    _salesUiState.value =
                        if (filtered.isEmpty()) SaleListUiState.Empty
                        else SaleListUiState.WithSales(filtered)
                }
        }
    }

    /** Carga ventas + productos + PDV/stock. */
    fun refreshAll() {
        viewModelScope.launch {
            val unitId = _activeUnitId.value.ifBlank { null }

            _context.value = _context.value.copy(loading = true, error = null)
            _salesUiState.value = SaleListUiState.Loading

            loadPosSnapshot(unitId)
                .onSuccess { snap ->
                    _context.value = PosContextState(
                        products = snap.products,
                        units = snap.units,
                        unitStocks = if (unitId == null) emptyList()
                        else snap.unitStocks,
                        loading = false,
                    )
                    updateAssignedUnitState(snap.units)

                    // La venta mostrada debe corresponder al PDV autenticado.
                    // Usamos el mismo snapshot que ya resolvió el unitId para
                    // no depender de que observeSales vuelva a emitir.
                    val visibleSales = if (unitId == null) {
                        emptyList()
                    } else {
                        snap.sales.filter { it.unitId == unitId }
                    }
                    _salesUiState.value =
                        if (visibleSales.isEmpty()) SaleListUiState.Empty
                        else SaleListUiState.WithSales(visibleSales)
                }
                .onFailure { e ->
                    _context.value = _context.value.copy(
                        loading = false,
                        error = e.message ?: "Error al cargar POS",
                    )
                    _assignedUnit.value = AssignedUnitUiState.Error(
                        e.message ?: "No se pudo cargar el punto de venta",
                    )
                    _salesUiState.value =
                        SaleListUiState.Error(e.message ?: "Error al cargar ventas")
                }
        }
    }

    private fun updateAssignedUnitState(units: List<SalesUnit> = _context.value.units) {
        val unitId = _activeUnitId.value
        if (unitId.isBlank()) {
            _assignedUnit.value = AssignedUnitUiState.None
            return
        }

        val unit = units.firstOrNull { it.id == unitId }
        AbacoLog.step(
            LogCategory.POS,
            "SalesViewModel",
            "match SalesUnit",
            "requestedUnitId=$unitId availableUnits=${units.map { it.id to it.name }}",
        )
        _assignedUnit.value = if (unit == null) {
            AssignedUnitUiState.Error(
                "El punto de venta asignado ($unitId) no existe o no está disponible",
            )
        } else if (!unit.active) {
            AssignedUnitUiState.Error(
                "El punto de venta asignado está inactivo",
            )
        } else {
            AssignedUnitUiState.Ready(
                unitId = unit.id,
                unitName = unit.name.ifBlank { unit.code.ifBlank { unit.id } },
            )
        }
    }

    /**
     * Devuelve las tres listas que consume la pantalla principal.
     * OUT = 0, LOW = 1..5, OK > 5.
     */
    fun stockBoards(): Triple<List<LocalStock>, List<LocalStock>, List<LocalStock>> {
        val productNames = _context.value.products.associateBy { it.id }
        val unitId = _activeUnitId.value

        val rows = _context.value.unitStocks
            .filter { unitId.isNotBlank() && it.unitId == unitId }
            .map {
                LocalStock(
                    productId = it.productId,
                    posId = it.unitId,
                    productName = productNames[it.productId]?.name ?: it.productId,
                    qty = it.qty,
                    unitPrice = (productNames[it.productId]?.effectiveUnitPrice() ?: 0.0)
                        .takeIf { price -> price > 0.0 }
                        ?: it.avgCost,
                )
            }

        return Triple(
            rows.filter { it.qty <= 0.0 },
            rows.filter { it.qty > 0.0 && it.qty <= 5.0 },
            rows.filter { it.qty > 5.0 },
        )
    }

    fun createSale(input: CreateSaleInput) {
        viewModelScope.launch {
            _registerState.value = RegisterSaleUiState.Saving
            registerSale(input)
                .onSuccess { sale ->
                    _registerState.value = RegisterSaleUiState.Success(sale)
                    refreshAll()
                }
                .onFailure { e ->
                    _registerState.value =
                        RegisterSaleUiState.Error(e.message ?: "No se pudo registrar la venta")
                }
        }
    }

    fun clearRegisterState() {
        _registerState.value = RegisterSaleUiState.Idle
    }

    fun stockOf(productId: String): Double {
        val unitId = _activeUnitId.value
        if (unitId.isBlank()) return 0.0

        return _context.value.unitStocks
            .firstOrNull { it.unitId == unitId && it.productId == productId }
            ?.qty ?: 0.0
    }

    fun loadSaleById(
        saleId: String,
        onSuccess: (Sale) -> Unit,
        onError: (String) -> Unit,
    ) {
        viewModelScope.launch {
            getSaleById(saleId)
                .onSuccess(onSuccess)
                .onFailure { onError(it.message ?: "Venta no encontrada") }
        }
    }
}
