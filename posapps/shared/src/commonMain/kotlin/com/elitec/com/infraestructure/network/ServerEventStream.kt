package com.elitec.com.infraestructure.network

import com.elitec.com.infraestructure.logging.AbacoLog
import com.elitec.com.infraestructure.logging.LogCategory
import io.ktor.client.HttpClient
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.HttpTimeoutConfig
import io.ktor.client.plugins.timeout
import io.ktor.client.request.bearerAuth
import io.ktor.client.request.header
import io.ktor.client.request.prepareGet
import io.ktor.client.statement.bodyAsChannel
import io.ktor.http.HttpHeaders
import io.ktor.utils.io.readUTF8Line
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlin.math.min
import kotlin.time.Duration.Companion.milliseconds

/**
 * Canal SSE hacia `GET /api/v1/events`.
 *
 * No es polling de negocio: una conexión larga con reconexión backoff.
 * Al abrir el stream → el backend está vivo → [ServerConnectivityGuard.markOk]
 * y se emite [ServerRealtimeEvent.Connected] para drenar outbox automáticamente.
 *
 * Futuro: mismos eventos para stock, confirmaciones push, etc.
 */
sealed class ServerRealtimeEvent {
    data object Connected : ServerRealtimeEvent()
    data object Disconnected : ServerRealtimeEvent()
    data class Message(val event: String, val data: String) : ServerRealtimeEvent()
}

class ServerEventStream(
    private val http: HttpClient,
    private val apiConfig: ApiConfig,
    private val connectivity: ServerConnectivityGuard,
    private val tokenProvider: suspend () -> String?,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private var job: Job? = null

    private val _running = MutableStateFlow(false)
    val running: StateFlow<Boolean> = _running.asStateFlow()

    private val _events = MutableSharedFlow<ServerRealtimeEvent>(extraBufferCapacity = 32)
    val events: SharedFlow<ServerRealtimeEvent> = _events.asSharedFlow()

    fun start() {
        if (job?.isActive == true) return
        AbacoLog.i(LogCategory.APP, "SSE stream start")
        _running.value = true
        job = scope.launch { runLoop() }
    }

    fun stop() {
        AbacoLog.i(LogCategory.APP, "SSE stream stop")
        _running.value = false
        job?.cancel()
        job = null
    }

    private suspend fun runLoop() {
        var attempt = 0
        while (_running.value) {
            val token = tokenProvider()
            if (token.isNullOrBlank()) {
                delay(2_000.milliseconds)
                continue
            }
            val base = apiConfig.baseUrl.trimEnd('/')
            if (base.isBlank()) {
                delay(3_000.milliseconds)
                continue
            }
            val url = "$base/events"
            try {
                AbacoLog.i(LogCategory.API, "SSE connecting $url")
                http.prepareGet(url) {
                    bearerAuth(token)
                    header(HttpHeaders.Accept, "text/event-stream")
                    header(HttpHeaders.CacheControl, "no-cache")
                    // stream largo: sin requestTimeout agresivo
                    timeout {
                        // Stream largo: infinito (0 no es válido en Ktor)
                        requestTimeoutMillis = HttpTimeoutConfig.INFINITE_TIMEOUT_MS
                        socketTimeoutMillis = HttpTimeoutConfig.INFINITE_TIMEOUT_MS
                        connectTimeoutMillis = 15_000
                    }
                }.execute { response ->
                    if (response.status.value !in 200..299) {
                        error("SSE HTTP ${response.status.value}")
                    }
                    attempt = 0
                    connectivity.markOk()
                    _events.tryEmit(ServerRealtimeEvent.Connected)
                    AbacoLog.i(LogCategory.APP, "SSE connected → backend reachable")

                    val channel = response.bodyAsChannel()
                    var eventName = "message"
                    while (!channel.isClosedForRead && _running.value) {
                        val line = channel.readUTF8Line() ?: break
                        when {
                            line.startsWith(":") -> {
                                // keepalive comment — backend vivo
                            }
                            line.startsWith("event:") -> {
                                eventName = line.removePrefix("event:").trim()
                            }
                            line.startsWith("data:") -> {
                                val data = line.removePrefix("data:").trim()
                                _events.tryEmit(ServerRealtimeEvent.Message(eventName, data))
                                if (eventName == "connected" || eventName == "ping") {
                                    connectivity.markOk()
                                }
                                eventName = "message"
                            }
                            line.isBlank() -> {
                                // end of event
                            }
                        }
                    }
                }
                _events.tryEmit(ServerRealtimeEvent.Disconnected)
                AbacoLog.w(LogCategory.APP, "SSE stream ended")
            } catch (t: Throwable) {
                if (!_running.value) break
                AbacoLog.w(LogCategory.APP, "SSE error: ${t.message}")
                _events.tryEmit(ServerRealtimeEvent.Disconnected)
            }

            // Backoff exponencial (máx 60s) — no es polling de APIs de venta
            attempt++
            val wait = min(60_000L, 1_000L * (1L shl min(attempt, 6)))
            AbacoLog.i(LogCategory.APP, "SSE reconnect in ${wait}ms (attempt=$attempt)")
            delay(wait.milliseconds)
        }
    }

}

