package com.elitec.com.feature.identity.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.elitec.com.feature.identity.domain.caseuse.LogoutCaseUse
import com.elitec.com.infraestructure.logging.AbacoLog
import com.elitec.com.infraestructure.logging.LogCategory
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class LogoutUiState {
    data object Idle : LogoutUiState()
    data object Loading : LogoutUiState()
}

sealed class HomeSessionEvent {
    data object NavigateLogin : HomeSessionEvent()
}

class HomeSessionViewModel(
    private val logoutUseCase: LogoutCaseUse,
) : ViewModel() {

    private val _logoutState = MutableStateFlow<LogoutUiState>(LogoutUiState.Idle)
    val logoutState: StateFlow<LogoutUiState> = _logoutState.asStateFlow()

    private val _events = MutableSharedFlow<HomeSessionEvent>(extraBufferCapacity = 1)
    val events: SharedFlow<HomeSessionEvent> = _events.asSharedFlow()

    private var logoutInFlight = false

    fun logout() {
        if (logoutInFlight) return
        logoutInFlight = true
        viewModelScope.launch {
            _logoutState.value = LogoutUiState.Loading
            AbacoLog.step(LogCategory.AUTH, "Logout", "start")
            runCatching { logoutUseCase() }
                .onSuccess { AbacoLog.step(LogCategory.AUTH, "Logout", "sesión borrada") }
                .onFailure { e -> AbacoLog.w(LogCategory.AUTH, "Logout aviso: ${e.message}", e) }
            _logoutState.value = LogoutUiState.Idle
            _events.emit(HomeSessionEvent.NavigateLogin)
            // no reset logoutInFlight: esta pantalla se destruye al navegar
        }
    }
}
