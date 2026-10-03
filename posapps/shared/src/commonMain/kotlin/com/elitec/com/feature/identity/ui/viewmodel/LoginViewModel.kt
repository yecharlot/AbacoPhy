package com.elitec.com.feature.identity.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.elitec.com.feature.identity.domain.caseuse.LoginCaseUse
import com.elitec.com.feature.identity.domain.entities.LoginCredentials
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class LoginUiState {
    data object Idle : LoginUiState()
    data object Loading : LoginUiState()
    data object Success : LoginUiState()
    data class Error(val message: String) : LoginUiState()
}

class LoginViewModel(
    private val login: LoginCaseUse,
) : ViewModel() {

    private val _uiState = MutableStateFlow<LoginUiState>(LoginUiState.Idle)
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

    var username: String = ""
    var password: String = ""

    fun submit() {
        viewModelScope.launch {
            _uiState.value = LoginUiState.Loading
            login(LoginCredentials(username = username.trim(), password = password))
                .onSuccess { _uiState.value = LoginUiState.Success }
                .onFailure { e ->
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
