package com.elitec.com.feature.pos.ui.components

/**
 * Estado de la asociación usuario autenticado → empleado → punto de venta.
 *
 * La asociación se resuelve desde la metadata de la sesión; la UI nunca
 * necesita consultar /payroll/employees para un vendedor.
 */
sealed interface AssignedUnitUiState {
    data object Idle : AssignedUnitUiState
    data object Loading : AssignedUnitUiState
    data object None : AssignedUnitUiState

    data class Ready(
        val unitId: String,
        val unitName: String,
    ) : AssignedUnitUiState

    data class Error(
        val message: String,
    ) : AssignedUnitUiState
}
