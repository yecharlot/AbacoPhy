package com.elitec.com.feature.settings.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.elitec.com.feature.settings.domain.ProbeApiConnection
import com.elitec.com.infraestructure.network.ApiConfig
import com.elitec.com.infraestructure.settings.AppSettingsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class InitialSetupUiState(
    val urlInput: String = "",
    val testing: Boolean = false,
    val error: String? = null,
    val successMessage: String? = null,
)

class InitialSetupViewModel(
    private val settings: AppSettingsRepository,
    private val apiConfig: ApiConfig,
    private val probe: ProbeApiConnection,
) : ViewModel() {
    private val _state = MutableStateFlow(InitialSetupUiState())
    val state: StateFlow<InitialSetupUiState> = _state.asStateFlow()

    fun onUrlChange(value: String) {
        _state.update { it.copy(urlInput = value, error = null, successMessage = null) }
    }

    fun testAndSave(onConfigured: () -> Unit) {
        val raw = _state.value.urlInput
        viewModelScope.launch {
            _state.update { it.copy(testing = true, error = null, successMessage = null) }
            val result = probe.execute(raw)
            result.fold(
                onSuccess = { normalized ->
                    settings.setBaseUrl(normalized)
                    apiConfig.update(normalized)
                    _state.update {
                        it.copy(testing = false, successMessage = "Conexión correcta", urlInput = normalized)
                    }
                    onConfigured()
                },
                onFailure = { e ->
                    _state.update {
                        it.copy(testing = false, error = e.message ?: "Conexión fallida")
                    }
                },
            )
        }
    }
}
