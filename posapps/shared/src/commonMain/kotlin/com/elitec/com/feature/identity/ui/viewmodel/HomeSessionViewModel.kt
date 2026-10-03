package com.elitec.com.feature.identity.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.elitec.com.feature.identity.domain.caseuse.LogoutCaseUse
import com.elitec.com.infraestructure.logging.AbacoLog
import com.elitec.com.infraestructure.logging.LogCategory
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class LogoutUiState {
    data object Idle : LogoutUiState()
    data object Loading : LogoutUiState()
}

/**
 * Solo limpia sesión. NavHost reacciona a NoSession → Login.
 */
class HomeSessionViewModel(
    private val logoutUseCase: LogoutCaseUse,
) : ViewModel() {

    private val _logoutState = MutableStateFlow<LogoutUiState>(LogoutUiState.Idle)
    val logoutState: StateFlow<LogoutUiState> = _logoutState.asStateFlow()

    private var inFlight = false

    fun logout() {
        if (inFlight) return
        inFlight = true
        viewModelScope.launch {
            _logoutState.value = LogoutUiState.Loading
            AbacoLog.step(LogCategory.AUTH, "Logout", "start")
            runCatching { logoutUseCase() }
                .onSuccess { AbacoLog.step(LogCategory.AUTH, "Logout", "OK (NoSession)") }
                .onFailure { e -> AbacoLog.w(LogCategory.AUTH, "Logout aviso: ${e.message}", e) }
            _logoutState.value = LogoutUiState.Idle
            inFlight = false
        }
    }
}
