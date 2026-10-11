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

/**
 * Primera configuración (o reconfiguración forzada).
 * **Solo persiste la URL si /info o /health responden correctamente.**
 */
class InitialSetupViewModel(
    private val settings: AppSettingsRepository,
    private val apiConfig: ApiConfig,
    private val probe: ProbeApiConnection,
) : ViewModel() {
    private val _state = MutableStateFlow(
        InitialSetupUiState(
            urlInput = apiConfig.baseUrl.ifBlank { settings.getBaseUrl().orEmpty() },
        ),
    )
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
                    // Solo aquí se guarda: health/info OK
                    settings.setBaseUrl(normalized)
                    apiConfig.update(normalized)
                    _state.update {
                        it.copy(
                            testing = false,
                            successMessage = "Conexión correcta · $normalized",
                            urlInput = normalized,
                        )
                    }
                    onConfigured()
                },
                onFailure = { e ->
                    _state.update {
                        it.copy(
                            testing = false,
                            error = e.message
                                ?: "No se pudo validar el servidor. La URL no se guardó.",
                            successMessage = null,
                        )
                    }
                    // No persistir URL fallida
                },
            )
        }
    }
}
