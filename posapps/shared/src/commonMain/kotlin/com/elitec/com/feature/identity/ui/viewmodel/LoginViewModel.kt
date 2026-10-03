package com.elitec.com.feature.identity.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.elitec.com.feature.identity.domain.caseuse.LoginCaseUse
import com.elitec.com.feature.identity.domain.entities.LoginCredentials
import com.elitec.com.infraestructure.logging.AbacoLog
import com.elitec.com.infraestructure.logging.LogCategory
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class LoginUiState {
    data object Idle : LoginUiState()
    data object Loading : LoginUiState()
    data class Error(val message: String) : LoginUiState()
}

/**
 * Solo autentica. Al guardar sesión, SessionControl.Active hace que NavHost muestre Home.
 */
class LoginViewModel(
    private val loginUseCase: LoginCaseUse,
) : ViewModel() {

    private val _uiState = MutableStateFlow<LoginUiState>(LoginUiState.Idle)
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

    var username: String = ""
    var password: String = ""

    fun submit() {
        viewModelScope.launch {
            _uiState.value = LoginUiState.Loading
            AbacoLog.step(LogCategory.AUTH, "Login", "submit")
            loginUseCase(LoginCredentials(username = username.trim(), password = password))
                .onSuccess {
                    AbacoLog.step(LogCategory.AUTH, "Login", "OK (sesión Active)")
                    password = ""
                    _uiState.value = LoginUiState.Idle
                }
                .onFailure { e ->
                    AbacoLog.e(LogCategory.AUTH, "Login falló", e)
                    _uiState.value = LoginUiState.Error(e.message ?: "No se pudo iniciar sesión")
                }
        }
    }

    fun clearError() {
        if (_uiState.value is LoginUiState.Error) _uiState.value = LoginUiState.Idle
    }
}
