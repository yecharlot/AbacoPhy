package com.elitec.com.feature.identity.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.elitec.com.feature.identity.domain.caseuse.LoginCaseUse
import com.elitec.com.feature.identity.domain.entities.LoginCredentials
import com.elitec.com.infraestructure.logging.AbacoLog
import com.elitec.com.infraestructure.logging.LogCategory
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class LoginUiState {
    data object Idle : LoginUiState()
    data object Loading : LoginUiState()
    data class Error(val message: String) : LoginUiState()
}

sealed class LoginEvent {
    data object NavigateHome : LoginEvent()
}

class LoginViewModel(
    private val login: LoginCaseUse,
) : ViewModel() {

    private val _uiState = MutableStateFlow<LoginUiState>(LoginUiState.Idle)
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

    private val _events = MutableSharedFlow<LoginEvent>(extraBufferCapacity = 1)
    val events: SharedFlow<LoginEvent> = _events.asSharedFlow()

    var username: String = ""
    var password: String = ""

    fun submit() {
        viewModelScope.launch {
            _uiState.value = LoginUiState.Loading
            AbacoLog.step(LogCategory.AUTH, "Login", "submit")
            login(LoginCredentials(username = username.trim(), password = password))
                .onSuccess {
                    AbacoLog.step(LogCategory.AUTH, "Login", "OK → Home")
                    password = ""
                    _uiState.value = LoginUiState.Idle
                    _events.emit(LoginEvent.NavigateHome)
                }
                .onFailure { e ->
                    AbacoLog.e(LogCategory.AUTH, "Login falló", e)
                    _uiState.value = LoginUiState.Error(
                        e.message ?: "No se pudo iniciar sesión",
                    )
                }
        }
    }

    fun clearError() {
        if (_uiState.value is LoginUiState.Error) {
            _uiState.value = LoginUiState.Idle
        }
    }
}
