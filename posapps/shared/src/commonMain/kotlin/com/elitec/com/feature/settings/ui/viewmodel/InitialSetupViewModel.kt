package com.elitec.com.feature.settings.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.elitec.com.feature.server_discovery.DiscoveredServer
import com.elitec.com.feature.server_discovery.PlatformServerDiscovery
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
    val discovering: Boolean = false,
    val error: String? = null,
    val successMessage: String? = null,
    val discoveredServers: List<DiscoveredServer> = emptyList(),
)

class InitialSetupViewModel(
    private val settings: AppSettingsRepository,
    private val apiConfig: ApiConfig,
    private val probe: ProbeApiConnection,
) : ViewModel() {
    private val discovery = PlatformServerDiscovery()
    private val _state = MutableStateFlow(
        InitialSetupUiState(urlInput = apiConfig.baseUrl.ifBlank { settings.getBaseUrl().orEmpty() }),
    )
    val state: StateFlow<InitialSetupUiState> = _state.asStateFlow()

    fun onUrlChange(value: String) {
        _state.update { it.copy(urlInput = value, error = null, successMessage = null) }
    }

    fun searchServers(onConfigured: () -> Unit) {
        if (_state.value.discovering || _state.value.testing) return
        viewModelScope.launch {
            _state.update { it.copy(discovering = true, error = null, successMessage = null, discoveredServers = emptyList()) }
            val candidates = runCatching { discovery.discover() }.getOrElse { emptyList() }
            val compatible = candidates.distinctBy { it.baseUrl }.filter { candidate ->
                probe.validateDiscovered(candidate.baseUrl).isSuccess
            }
            when (compatible.size) {
                0 -> _state.update {
                    it.copy(
                        discovering = false,
                        error = "No se encontró ningún servidor AbacoPhy compatible. Compruebe que ambos dispositivos están en la misma red; también puede introducir la URL manualmente.",
                    )
                }
                1 -> selectServer(compatible.first(), onConfigured)
                else -> _state.update {
                    it.copy(
                        discovering = false,
                        discoveredServers = compatible,
                        successMessage = "Se encontraron varios servidores. Seleccione el que desea usar.",
                    )
                }
            }
        }
    }

    fun selectServer(server: DiscoveredServer, onConfigured: () -> Unit) {
        if (_state.value.testing) return
        viewModelScope.launch {
            _state.update { it.copy(testing = true, discovering = false, error = null) }
            probe.validateDiscovered(server.baseUrl).fold(
                onSuccess = { normalized ->
                    settings.setBaseUrl(normalized)
                    apiConfig.update(normalized)
                    _state.update {
                        it.copy(
                            testing = false,
                            urlInput = normalized,
                            successMessage = "Conexión correcta · \${server.name}",
                            discoveredServers = emptyList(),
                        )
                    }
                    onConfigured()
                },
                onFailure = { e ->
                    _state.update {
                        it.copy(testing = false, error = e.message ?: "El servidor dejó de responder. Puede reintentar o introducir la URL manualmente.")
                    }
                },
            )
        }
    }

    fun testAndSave(onConfigured: () -> Unit) {
        val raw = _state.value.urlInput
        viewModelScope.launch {
            _state.update { it.copy(testing = true, error = null, successMessage = null) }
            probe.execute(raw).fold(
                onSuccess = { normalized ->
                    settings.setBaseUrl(normalized)
                    apiConfig.update(normalized)
                    _state.update {
                        it.copy(
                            testing = false,
                            successMessage = "Conexión correcta · $normalized",
                            urlInput = normalized,
                            discoveredServers = emptyList(),
                        )
                    }
                    onConfigured()
                },
                onFailure = { e ->
                    _state.update {
                        it.copy(
                            testing = false,
                            error = e.message ?: "No se pudo validar el servidor. La URL no se guardó.",
                        )
                    }
                },
            )
        }
    }
}
