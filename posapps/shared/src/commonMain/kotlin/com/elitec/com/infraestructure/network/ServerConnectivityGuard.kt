package com.elitec.com.infraestructure.network

import com.elitec.com.feature.settings.domain.ProbeApiConnection
import com.elitec.com.infraestructure.logging.AbacoLog
import com.elitec.com.infraestructure.logging.LogCategory
import com.elitec.com.infraestructure.network.ServerConnectivityState.Companion.OFFLINE_SHIFT_MS
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

/**
 * Política de conectividad POS — resiliencia ante cortes largos (p.ej. Cuba).
 *
 * Contexto operativo:
 * - Cortes de energía pueden dejar la red caída **varias horas** (4–6 h o más).
 * - Un PDV con respaldo eléctrico debe **seguir vendiendo** aunque el backend
 *   o el ISP estén fuera.
 * - La confiabilidad del sistema = operatividad local + cola (outbox) + sync
 *   cuando vuelve la luz/red, no = “dialogar hasta que haya servidor”.
 *
 * Reglas:
 * 1. **Sin sesión** (login / setup): Unreachable bloqueante — no hay token local
 *    útil para empezar turno sin haber autenticado.
 * 2. **Sesión activa + fallo de transporte** (connection refused, timeout, etc.):
 *    Unreachable **nunca bloqueante**. Chip/rail «Sin conexión» + outbox.
 *    La caja no se detiene durante todo el turno / corte.
 * 3. **Mal configuración de URL** (HTML/PWA, path): bloqueante — hay que corregir.
 * 4. **[OFFLINE_SHIFT_MS]** (~6 h): ventana de referencia de un corte típico;
 *    se expone para métricas/UI informativa, **no** para forzar modal en caja.
 */
sealed class ServerConnectivityState {
    data object Unknown : ServerConnectivityState()
    data object Ok : ServerConnectivityState()

    data class Unreachable(
        val baseUrl: String,
        val reason: String,
        /** Ofrecer «Cambiar URL» (misconfig o URL dudosa). */
        val suggestUpdateUrl: Boolean = true,
        /**
         * true → diálogo modal permitido.
         * false → solo feedback no modal (rail / chip); POS no se detiene.
         */
        val requiresBlockingUi: Boolean = true,
        /** Epoch ms desde el que se considera offline continuo. */
        val sinceEpochMs: Long = 0L,
    ) : ServerConnectivityState() {
        fun offlineDurationMs(nowMs: Long = Clock.System.now().toEpochMilliseconds()): Long =
            if (sinceEpochMs <= 0L) 0L else (nowMs - sinceEpochMs).coerceAtLeast(0L)

        /**
         * true solo si la política exige modal (misconfig).
         * Los cortes de transporte largos (horas) **no** escalan a bloqueo:
         * el POS debe seguir operativo todo el turno.
         */
        fun escalateBlocking(
            nowMs: Long = Clock.System.now().toEpochMilliseconds(),
        ): Boolean = requiresBlockingUi

        /** true si el offline ya supera un corte típico de jornada (~6 h). Solo informativo. */
        fun isLongOutage(
            nowMs: Long = Clock.System.now().toEpochMilliseconds(),
        ): Boolean = offlineDurationMs(nowMs) >= OFFLINE_SHIFT_MS
    }

    companion object {
        /**
         * Ventana de referencia de corte de energía/red en despliegues con
         * infraestructura inestable (p.ej. hasta ~6 h). No dispara modal en sesión.
         */
        const val OFFLINE_SHIFT_MS: Long = 6L * 60L * 60L * 1000L
    }
}

class ServerConnectivityGuard(
    private val apiConfig: ApiConfig,
    private val probe: ProbeApiConnection,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val mutex = Mutex()
    private var lastProbeAtMs: Long = 0L
    private var offlineSinceMs: Long = 0L

    private val _state = MutableStateFlow<ServerConnectivityState>(ServerConnectivityState.Unknown)
    val state: StateFlow<ServerConnectivityState> = _state.asStateFlow()

    fun onTransportFailure(requestUrl: String, cause: Throwable) {
        if (!isTransportFailure(cause)) return
        scheduleProbe(
            trigger = "transport",
            detail = cause.message ?: cause::class.simpleName.orEmpty(),
            requestUrl = requestUrl,
            // Backend caído / red: no bloquear POS; outbox asume el trabajo.
            blocking = false,
            suggestUrl = false,
        )
    }

    fun onApiMisconfiguration(requestUrl: String, reason: String) {
        val base = apiConfig.baseUrl.ifBlank {
            requestUrl.substringBefore("/auth").substringBefore("/api")
                .ifBlank { requestUrl }
        }
        AbacoLog.e(LogCategory.APP, "API misconfiguration: $reason | $requestUrl")
        markUnreachable(
            reason = reason,
            suggestUpdateUrl = true,
            requiresBlockingUi = true,
            baseOverride = ApiConfig.ensureApiV1(base.ifBlank { apiConfig.baseUrl }),
        )
        scheduleProbe(
            trigger = "misconfig",
            detail = reason,
            requestUrl = requestUrl,
            blocking = true,
            suggestUrl = true,
        )
    }

    private fun scheduleProbe(
        trigger: String,
        detail: String,
        requestUrl: String,
        blocking: Boolean,
        suggestUrl: Boolean,
    ) {
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
                if (trigger != "misconfig") {
                    markOk()
                }
            } else {
                val reason = result.exceptionOrNull()?.message
                    ?: detail.ifBlank { "No se pudo contactar el servidor" }
                AbacoLog.e(LogCategory.APP, "Health FAIL: $reason")
                markUnreachable(
                    reason = reason,
                    suggestUpdateUrl = suggestUrl,
                    requiresBlockingUi = blocking,
                )
            }
        }
    }

    private fun markUnreachable(
        reason: String,
        suggestUpdateUrl: Boolean,
        requiresBlockingUi: Boolean,
        baseOverride: String? = null,
    ) {
        val now = Clock.System.now().toEpochMilliseconds()
        if (offlineSinceMs <= 0L) offlineSinceMs = now
        _state.value = ServerConnectivityState.Unreachable(
            baseUrl = baseOverride ?: apiConfig.baseUrl,
            reason = reason,
            suggestUpdateUrl = suggestUpdateUrl,
            requiresBlockingUi = requiresBlockingUi,
            sinceEpochMs = offlineSinceMs,
        )
    }

    fun dismiss() {
        if (_state.value is ServerConnectivityState.Unreachable) {
            _state.value = ServerConnectivityState.Unknown
            // No borramos offlineSinceMs: si sigue caído, el próximo fallo reanuda el reloj.
        }
    }

    fun markOk() {
        offlineSinceMs = 0L
        _state.value = ServerConnectivityState.Ok
    }

    fun recheck(onDone: ((Boolean) -> Unit)? = null) {
        scope.launch {
            val result = probe.probeConfigured(apiConfig)
            val ok = result.isSuccess
            if (ok) {
                markOk()
            } else {
                // Recheck manual: si el usuario pide reintentar, no forzar modal agresivo
                // por transporte; misconfig sigue siendo bloqueante si el reason lo indica.
                val reason = result.exceptionOrNull()?.message ?: "Servidor no disponible"
                val misconfig = reason.contains("HTML", ignoreCase = true) ||
                    reason.contains("api/v1", ignoreCase = true) ||
                    reason.contains("PWA", ignoreCase = true)
                markUnreachable(
                    reason = reason,
                    suggestUpdateUrl = true,
                    requiresBlockingUi = misconfig,
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
