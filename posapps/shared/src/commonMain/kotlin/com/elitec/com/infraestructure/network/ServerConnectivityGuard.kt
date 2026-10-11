package com.elitec.com.infraestructure.network

import com.elitec.com.feature.settings.domain.ProbeApiConnection
import com.elitec.com.infraestructure.logging.AbacoLog
import com.elitec.com.infraestructure.logging.LogCategory
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlin.time.Clock

sealed class ServerConnectivityState {
    data object Unknown : ServerConnectivityState()
    data object Ok : ServerConnectivityState()
    /**
     * No se pudo validar el servidor. La UI debe ofrecer:
     * - Reintentar (health)
     * - Cambiar URL base
     */
    data class Unreachable(
        val baseUrl: String,
        val reason: String,
        val suggestUpdateUrl: Boolean = true,
    ) : ServerConnectivityState()
}

class ServerConnectivityGuard(
    private val apiConfig: ApiConfig,
    private val probe: ProbeApiConnection,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val mutex = Mutex()
    private var lastProbeAtMs: Long = 0L

    private val _state = MutableStateFlow<ServerConnectivityState>(ServerConnectivityState.Unknown)
    val state: StateFlow<ServerConnectivityState> = _state.asStateFlow()

    fun onTransportFailure(requestUrl: String, cause: Throwable) {
        if (!isTransportFailure(cause)) return
        scheduleProbe(
            trigger = "transport",
            detail = cause.message ?: cause::class.simpleName.orEmpty(),
            requestUrl = requestUrl,
        )
    }

    fun onApiMisconfiguration(requestUrl: String, reason: String) {
        // URL apunta a PWA u otro servicio: no hace falta esperar health
        val base = apiConfig.baseUrl.ifBlank {
            // extraer origen de requestUrl
            requestUrl.substringBefore("/auth").substringBefore("/api")
                .ifBlank { requestUrl }
        }
        AbacoLog.e(LogCategory.APP, "API misconfiguration: $reason | $requestUrl")
        _state.value = ServerConnectivityState.Unreachable(
            baseUrl = ApiConfig.ensureApiV1(base.ifBlank { apiConfig.baseUrl }),
            reason = reason,
            suggestUpdateUrl = true,
        )
        // También sondear para confirmar
        scheduleProbe(trigger = "misconfig", detail = reason, requestUrl = requestUrl)
    }

    private fun scheduleProbe(trigger: String, detail: String, requestUrl: String) {
        val base = apiConfig.baseUrl
        if (base.isBlank()) return
        scope.launch {
            mutex.withLock {
                val now = Clock.System.now().toEpochMilliseconds()
                if (now - lastProbeAtMs < 3_000L &&
                    _state.value is ServerConnectivityState.Unreachable
                ) {
                    return@withLock
                }
                lastProbeAtMs = now
            }
            AbacoLog.w(
                LogCategory.APP,
                "Connectivity probe ($trigger) after failure on $requestUrl | $detail",
            )
            val result = probe.probeConfigured(apiConfig)
            if (result.isSuccess) {
                AbacoLog.i(LogCategory.APP, "Health OK (${result.getOrNull()})")
                // Si el fallo era misconfig (HTML en login), health OK no arregla el path:
                // solo marcamos Ok si no era misconfig de path.
                if (trigger != "misconfig") {
                    _state.value = ServerConnectivityState.Ok
                }
            } else {
                val reason = result.exceptionOrNull()?.message
                    ?: detail.ifBlank { "No se pudo contactar el servidor" }
                AbacoLog.e(LogCategory.APP, "Health FAIL: $reason")
                _state.value = ServerConnectivityState.Unreachable(
                    baseUrl = apiConfig.baseUrl,
                    reason = reason,
                    suggestUpdateUrl = true,
                )
            }
        }
    }

    fun dismiss() {
        if (_state.value is ServerConnectivityState.Unreachable) {
            _state.value = ServerConnectivityState.Unknown
        }
    }

    fun markOk() {
        _state.value = ServerConnectivityState.Ok
    }

    fun recheck(onDone: ((Boolean) -> Unit)? = null) {
        scope.launch {
            val result = probe.probeConfigured(apiConfig)
            val ok = result.isSuccess
            _state.value = if (ok) {
                ServerConnectivityState.Ok
            } else {
                ServerConnectivityState.Unreachable(
                    baseUrl = apiConfig.baseUrl,
                    reason = result.exceptionOrNull()?.message ?: "Servidor no disponible",
                    suggestUpdateUrl = true,
                )
            }
            onDone?.invoke(ok)
        }
    }

    companion object {
        fun isTransportFailure(t: Throwable): Boolean {
            var c: Throwable? = t
            while (c != null) {
                val name = c::class.simpleName.orEmpty()
                val msg = c.message.orEmpty().lowercase()
                if (
                    name.contains("Connect", ignoreCase = true) ||
                    name.contains("Socket", ignoreCase = true) ||
                    name.contains("UnknownHost", ignoreCase = true) ||
                    name.contains("Unresolved", ignoreCase = true) ||
                    name.contains("Timeout", ignoreCase = true) ||
                    msg.contains("connection refused") ||
                    msg.contains("failed to connect") ||
                    msg.contains("network is unreachable") ||
                    msg.contains("timed out") ||
                    msg.contains("no se ha conseguido recuperar") ||
                    msg.contains("failed to fetch")
                ) {
                    return true
                }
                c = c.cause
            }
            return false
        }
    }
}
