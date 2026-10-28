package com.elitec.com.feature.settings.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.elitec.com.feature.server_discovery.DiscoveredServer
import com.elitec.com.feature.server_discovery.PlatformServerDiscovery
import com.elitec.com.feature.settings.domain.ProbeApiConnection
import com.elitec.com.infraestructure.network.ApiConfig
import com.elitec.com.infraestructure.settings.AppSettingsRepository
import io.github.aakira.napier.Napier
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class SetupConnectionPhase {
    IDLE,
    SEARCHING,
    SERVER_FOUND,
    CONNECTING,
    READY,
    FAILED,
}

data class InitialSetupUiState(
    val urlInput: String = "",
    val testing: Boolean = false,
    val discovering: Boolean = false,
    val error: String? = null,
    val successMessage: String? = null,
    val discoveredServers: List<DiscoveredServer> = emptyList(),
    val phase: SetupConnectionPhase = SetupConnectionPhase.IDLE,
    val statusTitle: String = "Preparado para buscar",
    val statusDetail: String = "Buscaremos servidores AbacoPhy disponibles en tu red local.",
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

    /**
     * Política de arranque POS:
     * 1. intenta el último servidor conocido (la URL persistida contiene host/IP y puerto),
     * 2. solo si falla, vuelve a la política normal de discovery mDNS.
     */
    fun connectUsingCacheOrDiscover(onConfigured: () -> Unit) {
        if (_state.value.discovering || _state.value.testing) {
            Napier.w("CACHE_CONNECT_IGNORED already busy", tag = "AbacoPhy-Setup")
            return
        }

        val cachedUrl = settings.getBaseUrl()?.trim().orEmpty()
            .ifBlank { apiConfig.baseUrl.trim() }

        if (cachedUrl.isBlank()) {
            Napier.i("CACHE_MISS reason=no_saved_url", tag = "AbacoPhy-Setup")
            searchServers(onConfigured)
            return
        }

        viewModelScope.launch {
            Napier.i("CACHE_TRY url=$cachedUrl", tag = "AbacoPhy-Setup")
            _state.update {
                it.copy(
                    testing = true,
                    discovering = false,
                    error = null,
                    successMessage = null,
                    phase = SetupConnectionPhase.CONNECTING,
                    statusTitle = "Probando el último servidor",
                    statusDetail = "Intentando reutilizar la última dirección conocida (${cachedUrl.substringAfterLast("://")})…",
                )
            }

            probe.execute(cachedUrl).fold(
                onSuccess = { normalized ->
                    Napier.i("CACHE_HIT url=$normalized", tag = "AbacoPhy-Setup")
                    settings.setBaseUrl(normalized)
                    apiConfig.update(normalized)
                    _state.update {
                        it.copy(
                            testing = false,
                            urlInput = normalized,
                            successMessage = "Conexión recuperada · último servidor conocido",
                            discoveredServers = emptyList(),
                            phase = SetupConnectionPhase.READY,
                            statusTitle = "¡AbacoPhy está listo!",
                            statusDetail = "Servidor recuperado sin buscar en la red. Abriendo el inicio de sesión…",
                        )
                    }
                    delay(1_000)
                    onConfigured()
                },
                onFailure = { e ->
                    Napier.w(
                        "CACHE_MISS url=$cachedUrl reason=${e.message}",
                        tag = "AbacoPhy-Setup",
                    )
                    _state.update {
                        it.copy(
                            testing = false,
                            phase = SetupConnectionPhase.SEARCHING,
                            statusTitle = "Servidor anterior no disponible",
                            statusDetail = "No respondió en el último puerto conocido. Buscando servidores en la red…",
                        )
                    }
                    searchServers(onConfigured)
                },
            )
        }
    }

    fun onUrlChange(value: String) {
        _state.update {
            it.copy(
                urlInput = value,
                error = null,
                successMessage = null,
                phase = SetupConnectionPhase.IDLE,
                statusTitle = "URL lista para probar",
                statusDetail = "Comprueba que la dirección corresponde al servidor AbacoPhy.",
            )
        }
    }

    fun searchServers(onConfigured: () -> Unit) {
        if (_state.value.discovering || _state.value.testing) {
            Napier.w("SEARCH_IGNORED already busy", tag = "AbacoPhy-Setup")
            return
        }
        viewModelScope.launch {
            Napier.i("SEARCH_START source=InitialSetupScreen", tag = "AbacoPhy-Setup")
            _state.update {
                it.copy(
                    discovering = true,
                    error = null,
                    successMessage = null,
                    discoveredServers = emptyList(),
                    phase = SetupConnectionPhase.SEARCHING,
                    statusTitle = "Buscando servidores",
                    statusDetail = "Explorando la red local en busca de una instancia de AbacoPhy…",
                )
            }
            val candidates = runCatching {
                discovery.discover().also {
                    Napier.i("MDNS_FINISHED candidates=${it.size}", tag = "AbacoPhy-Setup")
                }
            }.getOrElse {
                Napier.e("MDNS_THROW type=${it::class.simpleName} message=${it.message}", it, tag = "AbacoPhy-Setup")
                emptyList()
            }

            if (candidates.isEmpty()) {
                failSetup(
                    "No se encontró ningún servidor AbacoPhy compatible. Compruebe que ambos dispositivos están en la misma red; también puede introducir la URL manualmente.",
                )
                return@launch
            }

            val compatible = mutableListOf<DiscoveredServer>()
            candidates.distinctBy { it.baseUrl }.forEach { candidate ->
                _state.update {
                    it.copy(
                        phase = SetupConnectionPhase.SERVER_FOUND,
                        statusTitle = "¡Servidor encontrado!",
                        statusDetail = "${candidate.name} · ${candidate.host}:${candidate.port}",
                    )
                }
                Napier.i(
                    "SERVER_FOUND name=${candidate.name} url=${candidate.baseUrl}",
                    tag = "AbacoPhy-Setup",
                )
                // Keep the discovered state visible before showing the connection attempt.
                delay(500)
                _state.update {
                    it.copy(
                        phase = SetupConnectionPhase.CONNECTING,
                        statusTitle = "Intentando conexión",
                        statusDetail = "Contactando con ${candidate.name} y verificando la API…",
                    )
                }
                val result = probe.validateDiscovered(candidate.baseUrl)
                if (result.isSuccess) {
                    Napier.i("CANDIDATE_ACCEPTED name=${candidate.name} url=${candidate.baseUrl}", tag = "AbacoPhy-Setup")
                    compatible += candidate
                } else {
                    Napier.w(
                        "CANDIDATE_REJECTED name=${candidate.name} url=${candidate.baseUrl} reason=${result.exceptionOrNull()?.message}",
                        tag = "AbacoPhy-Setup",
                    )
                }
            }

            Napier.i("SEARCH_FINISHED rawCandidates=${candidates.size} compatible=${compatible.size}", tag = "AbacoPhy-Setup")
            when (compatible.size) {
                0 -> failSetup(
                    "Encontramos un servicio, pero no pudimos conectar con una API AbacoPhy válida. Compruebe la red y vuelva a intentarlo.",
                )
                1 -> selectServer(compatible.first(), onConfigured)
                else -> _state.update {
                    it.copy(
                        discovering = false,
                        phase = SetupConnectionPhase.SERVER_FOUND,
                        discoveredServers = compatible,
                        statusTitle = "Se encontraron varios servidores",
                        statusDetail = "Selecciona el servidor al que deseas conectarte.",
                        successMessage = "Se encontraron varios servidores. Seleccione el que desea usar.",
                    )
                }
            }
        }
    }

    fun selectServer(server: DiscoveredServer, onConfigured: () -> Unit) {
        if (_state.value.testing) return
        viewModelScope.launch {
            _state.update {
                it.copy(
                    testing = true,
                    discovering = false,
                    error = null,
                    successMessage = null,
                    phase = SetupConnectionPhase.SERVER_FOUND,
                    statusTitle = "Servidor seleccionado",
                    statusDetail = "${server.name} · ${server.host}:${server.port}",
                )
            }
            // Let the user see which server was selected before testing it.
            delay(500)
            _state.update {
                it.copy(
                    phase = SetupConnectionPhase.CONNECTING,
                    statusTitle = "Intentando conexión",
                    statusDetail = "Verificando que el servidor responde correctamente…",
                )
            }
            probe.validateDiscovered(server.baseUrl).fold(
                onSuccess = { normalized ->
                    settings.setBaseUrl(normalized)
                    apiConfig.update(normalized)
                    _state.update {
                        it.copy(
                            urlInput = normalized,
                            successMessage = "Conexión correcta · ${server.name}",
                            discoveredServers = emptyList(),
                            phase = SetupConnectionPhase.READY,
                            statusTitle = "¡AbacoPhy está listo!",
                            statusDetail = "Conexión verificada. Abriendo el inicio de sesión…",
                        )
                    }
                    delay(1_000)
                    _state.update { it.copy(testing = false) }
                    onConfigured()
                },
                onFailure = { e ->
                    val message = e.message ?: "El servidor dejó de responder. Puede reintentar o introducir la URL manualmente."
                    _state.update {
                        it.copy(
                            testing = false,
                            error = message,
                            phase = SetupConnectionPhase.FAILED,
                            statusTitle = "No se pudo conectar",
                            statusDetail = "El servidor fue encontrado, pero no respondió correctamente.",
                        )
                    }
                },
            )
        }
    }

    fun testAndSave(onConfigured: () -> Unit) {
        val raw = _state.value.urlInput
        viewModelScope.launch {
            _state.update {
                it.copy(
                    testing = true,
                    error = null,
                    successMessage = null,
                    phase = SetupConnectionPhase.CONNECTING,
                    statusTitle = "Intentando conexión",
                    statusDetail = "Probando la URL introducida y verificando la API…",
                )
            }
            probe.execute(raw).fold(
                onSuccess = { normalized ->
                    settings.setBaseUrl(normalized)
                    apiConfig.update(normalized)
                    _state.update {
                        it.copy(
                            successMessage = "Conexión correcta · $normalized",
                            urlInput = normalized,
                            discoveredServers = emptyList(),
                            phase = SetupConnectionPhase.READY,
                            statusTitle = "¡AbacoPhy está listo!",
                            statusDetail = "Conexión verificada. Abriendo el inicio de sesión…",
                        )
                    }
                    delay(1_000)
                    _state.update { it.copy(testing = false) }
                    onConfigured()
                },
                onFailure = { e ->
                    val message = e.message ?: "No se pudo validar el servidor. La URL no se guardó."
                    _state.update {
                        it.copy(
                            testing = false,
                            error = message,
                            phase = SetupConnectionPhase.FAILED,
                            statusTitle = "No se pudo conectar",
                            statusDetail = "Revisa la URL, la red y que el servidor siga activo.",
                        )
                    }
                },
            )
        }
    }

    private fun failSetup(message: String) {
        _state.update {
            it.copy(
                discovering = false,
                testing = false,
                error = message,
                phase = SetupConnectionPhase.FAILED,
                statusTitle = "No se pudo conectar",
                statusDetail = "No fue posible establecer una conexión válida con AbacoPhy.",
            )
        }
    }
}
