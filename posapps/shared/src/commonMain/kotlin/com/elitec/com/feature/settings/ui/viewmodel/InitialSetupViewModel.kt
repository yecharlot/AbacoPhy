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

    companion object {
        private const val HEALTH_MAX_ATTEMPTS = 3 // intento inicial + 2 reintentos
        private const val HEALTH_RETRY_DELAY_MS = 750L
    }

    private val _state = MutableStateFlow(
        InitialSetupUiState(urlInput = apiConfig.baseUrl.ifBlank { settings.getBaseUrl().orEmpty() }),
    )
    val state: StateFlow<InitialSetupUiState> = _state.asStateFlow()

    /**
     * Bootstrap antes del login:
     * 1. intenta el último servidor conocido;
     * 2. comprueba /health hasta 3 veces (inicial + 2 reintentos);
     * 3. si sigue sin responder, inicia discovery mDNS;
     * 4. solo abre login cuando health + identidad/API están validados.
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
            Napier.i("BOOTSTRAP_CACHE_START url=$cachedUrl", tag = "AbacoPhy-Setup")
            _state.update {
                it.copy(
                    testing = true,
                    discovering = false,
                    error = null,
                    successMessage = null,
                    phase = SetupConnectionPhase.CONNECTING,
                    statusTitle = "Comprobando el servidor",
                    statusDetail = "Verificando que el último servidor conocido está disponible…",
                )
            }

            var healthResult: Result<String> = Result.failure(IllegalStateException("No se ha intentado health"))
            for (attempt in 1..HEALTH_MAX_ATTEMPTS) {
                if (attempt > 1) {
                    _state.update {
                        it.copy(
                            statusTitle = "Reintentando conexión ($attempt/$HEALTH_MAX_ATTEMPTS)",
                            statusDetail = "El servidor no respondió. Volviendo a comprobar su estado…",
                        )
                    }
                    delay(HEALTH_RETRY_DELAY_MS)
                } else {
                    _state.update {
                        it.copy(
                            statusTitle = "Comprobando servidor (1/$HEALTH_MAX_ATTEMPTS)",
                            statusDetail = "Consultando /health antes de abrir el inicio de sesión…",
                        )
                    }
                }

                healthResult = probe.checkHealth(cachedUrl)
                if (healthResult.isSuccess) {
                    Napier.i("BOOTSTRAP_HEALTH_OK attempt=$attempt url=$cachedUrl", tag = "AbacoPhy-Setup")
                    break
                }

                Napier.w(
                    "BOOTSTRAP_HEALTH_FAIL attempt=$attempt/$HEALTH_MAX_ATTEMPTS url=$cachedUrl reason=${healthResult.exceptionOrNull()?.message}",
                    tag = "AbacoPhy-Setup",
                )
            }

            if (healthResult.isSuccess) {
                val normalized = healthResult.getOrThrow()
                _state.update {
                    it.copy(
                        statusTitle = "Servidor disponible",
                        statusDetail = "Health correcto. Verificando identidad y versión de la API…",
                    )
                }

                probe.validateDiscovered(normalized).fold(
                    onSuccess = { readyUrl ->
                        configureReady(
                            normalized = readyUrl,
                            message = "Conexión recuperada · último servidor conocido",
                            detail = "Servidor saludable y API AbacoPhy verificada. Abriendo el inicio de sesión…",
                            onConfigured = onConfigured,
                        )
                    },
                    onFailure = { e ->
                        Napier.w(
                            "BOOTSTRAP_CACHE_INVALID url=$normalized reason=${e.message}; starting discovery",
                            tag = "AbacoPhy-Setup",
                        )
                        _state.update {
                            it.copy(
                                testing = false,
                                phase = SetupConnectionPhase.SEARCHING,
                                statusTitle = "Servidor no compatible",
                                statusDetail = "El servidor responde, pero no corresponde a una API AbacoPhy compatible. Buscando otra instancia…",
                            )
                        }
                        searchServers(onConfigured)
                    },
                )
                return@launch
            }

            Napier.w("BOOTSTRAP_HEALTH_EXHAUSTED url=$cachedUrl; starting discovery", tag = "AbacoPhy-Setup")
            _state.update {
                it.copy(
                    testing = false,
                    phase = SetupConnectionPhase.SEARCHING,
                    statusTitle = "Servidor anterior no disponible",
                    statusDetail = "Fallaron 2 reintentos. Buscando servidores AbacoPhy en la red…",
                )
            }
            searchServers(onConfigured)
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
                Napier.i("SERVER_FOUND name=${candidate.name} url=${candidate.baseUrl}", tag = "AbacoPhy-Setup")
                delay(500)
                _state.update {
                    it.copy(
                        phase = SetupConnectionPhase.CONNECTING,
                        statusTitle = "Comprobando servidor encontrado",
                        statusDetail = "Verificando /health e identidad de ${candidate.name}…",
                    )
                }
                val result = probe.validateServerReady(candidate.baseUrl)
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
                    "Encontramos servicios, pero ninguno pasó la comprobación de health y API AbacoPhy. Compruebe la red y vuelva a intentarlo.",
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
            delay(500)
            _state.update {
                it.copy(
                    phase = SetupConnectionPhase.CONNECTING,
                    statusTitle = "Comprobando servidor",
                    statusDetail = "Verificando /health antes de abrir el inicio de sesión…",
                )
            }
            probe.validateServerReady(server.baseUrl).fold(
                onSuccess = { normalized ->
                    configureReady(
                        normalized = normalized,
                        message = "Conexión correcta · ${server.name}",
                        detail = "Servidor saludable y API verificada. Abriendo el inicio de sesión…",
                        onConfigured = onConfigured,
                    )
                },
                onFailure = { e ->
                    val message = e.message ?: "El servidor dejó de responder. Puede reintentar o introducir la URL manualmente."
                    _state.update {
                        it.copy(
                            testing = false,
                            error = message,
                            phase = SetupConnectionPhase.FAILED,
                            statusTitle = "No se pudo conectar",
                            statusDetail = "El servidor fue encontrado, pero no pasó la comprobación de disponibilidad.",
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
                    statusTitle = "Comprobando servidor",
                    statusDetail = "Verificando /health y la API antes de abrir el inicio de sesión…",
                )
            }
            probe.execute(raw).fold(
                onSuccess = { normalized ->
                    configureReady(
                        normalized = normalized,
                        message = "Conexión correcta · $normalized",
                        detail = "Servidor saludable y API verificada. Abriendo el inicio de sesión…",
                        onConfigured = onConfigured,
                    )
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

    private fun configureReady(
        normalized: String,
        message: String,
        detail: String,
        onConfigured: () -> Unit,
    ) {
        settings.setBaseUrl(normalized)
        apiConfig.update(normalized)
        _state.update {
            it.copy(
                testing = false,
                urlInput = normalized,
                successMessage = message,
                discoveredServers = emptyList(),
                phase = SetupConnectionPhase.READY,
                statusTitle = "¡AbacoPhy está listo!",
                statusDetail = detail,
            )
        }
        viewModelScope.launch {
            delay(1_000)
            onConfigured()
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
