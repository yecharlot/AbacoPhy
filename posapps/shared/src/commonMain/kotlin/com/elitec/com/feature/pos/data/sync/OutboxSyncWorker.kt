package com.elitec.com.feature.pos.data.sync

import com.elitec.com.feature.outbox.domain.usecases.ObservePendingOutboxCount
import com.elitec.com.feature.pos.domain.caseuse.ReconcileOutboxSales
import com.elitec.com.feature.pos.domain.caseuse.SyncPendingOutboxOps
import com.elitec.com.infraestructure.logging.AbacoLog
import com.elitec.com.infraestructure.logging.LogCategory
import com.elitec.com.infraestructure.network.ServerConnectivityGuard
import com.elitec.com.infraestructure.network.ServerConnectivityState
import com.elitec.com.infraestructure.network.ServerEventStream
import com.elitec.com.infraestructure.network.ServerRealtimeEvent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Drena outbox **sin intervención del vendedor** cuando:
 * 1. [ServerConnectivityGuard] pasa a Ok (p.ej. tras health / transporte OK).
 * 2. [ServerEventStream] emite [ServerRealtimeEvent.Connected] (SSE recuperado).
 *
 * La UI solo observa [uiStatus] / [pendingCount]; no dispara el sync.
 */
class OutboxSyncWorker(
    private val connectivity: ServerConnectivityGuard,
    private val syncPending: SyncPendingOutboxOps,
    private val reconcileOutbox: ReconcileOutboxSales,
    private val observePendingCount: ObservePendingOutboxCount,
    private val eventStream: ServerEventStream,
) {
    sealed class UiStatus {
        data object Unknown : UiStatus()
        data object Online : UiStatus()
        data class Offline(val reason: String, val pendingOps: Int) : UiStatus()
        data class Syncing(val pendingOps: Int) : UiStatus()
        data class SyncFinished(
            val confirmed: Int,
            val stillPending: Int,
            val rejected: Int,
        ) : UiStatus()
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val drainMutex = Mutex()
    private var started = false
    private var dismissJob: Job? = null
    private var previousConnectivity: ServerConnectivityState = ServerConnectivityState.Unknown

    private val _uiStatus = MutableStateFlow<UiStatus>(UiStatus.Unknown)
    val uiStatus: StateFlow<UiStatus> = _uiStatus.asStateFlow()

    private val _pendingCount = MutableStateFlow(0)
    val pendingCount: StateFlow<Int> = _pendingCount.asStateFlow()

    fun start() {
        if (started) return
        started = true
        AbacoLog.i(LogCategory.POS, "OutboxSyncWorker start (auto-drain + SSE)")

        applyConnectivity(connectivity.state.value, allowDrain = false)

        scope.launch {
            observePendingCount.execute().collect { n ->
                _pendingCount.value = n
                val cur = _uiStatus.value
                if (cur is UiStatus.Offline) {
                    _uiStatus.value = cur.copy(pendingOps = n)
                }
            }
        }

        scope.launch {
            connectivity.state.collect { state ->
                applyConnectivity(state, allowDrain = true)
            }
        }

        // Recuperación por SSE: sin click del vendedor
        scope.launch {
            eventStream.events.collect { ev ->
                when (ev) {
                    is ServerRealtimeEvent.Connected -> {
                        AbacoLog.i(LogCategory.POS, "SSE Connected → auto drain outbox")
                        _uiStatus.value = UiStatus.Online
                        drainAndPublish()
                    }
                    is ServerRealtimeEvent.Disconnected -> {
                        if (_uiStatus.value !is UiStatus.Syncing) {
                            _uiStatus.value = UiStatus.Offline(
                                reason = "Canal en tiempo real desconectado",
                                pendingOps = _pendingCount.value,
                            )
                        }
                    }
                    is ServerRealtimeEvent.Message -> Unit
                }
            }
        }
    }

    fun requestSync() {
        scope.launch { drainAndPublish() }
    }

    fun dismissSyncFinished() {
        if (_uiStatus.value is UiStatus.SyncFinished) {
            _uiStatus.value = UiStatus.Online
        }
    }

    private fun applyConnectivity(state: ServerConnectivityState, allowDrain: Boolean) {
        when (state) {
            is ServerConnectivityState.Unreachable -> {
                if (!state.requiresBlockingUi) {
                    _uiStatus.value = UiStatus.Offline(
                        reason = state.reason,
                        pendingOps = _pendingCount.value,
                    )
                }
                previousConnectivity = state
            }
            is ServerConnectivityState.Ok -> {
                val cameOnline =
                    previousConnectivity is ServerConnectivityState.Unreachable ||
                        previousConnectivity is ServerConnectivityState.Unknown
                previousConnectivity = state
                if (allowDrain && cameOnline) {
                    AbacoLog.i(LogCategory.POS, "Connectivity OK → drain outbox")
                    scope.launch { drainAndPublish() }
                } else if (
                    _uiStatus.value !is UiStatus.Syncing &&
                    _uiStatus.value !is UiStatus.SyncFinished
                ) {
                    _uiStatus.value = UiStatus.Online
                }
            }
            is ServerConnectivityState.Unknown -> {
                previousConnectivity = state
                if (_uiStatus.value is UiStatus.Unknown) {
                    _uiStatus.value = UiStatus.Online
                }
            }
        }
    }

    private suspend fun drainAndPublish() {
        drainMutex.withLock {
            // 01.K3: cerrar ops ya confirmadas en servidor antes de reenviar
            try {
                val rec = reconcileOutbox.execute()
                if (rec.closed > 0) {
                    AbacoLog.i(
                        LogCategory.POS,
                        "Reconcile closed ${rec.closed}/${rec.scanned} outbox ops already on server",
                    )
                }
            } catch (t: Throwable) {
                AbacoLog.w(LogCategory.POS, "ReconcileOutboxSales error: ${t.message}")
            }
            val pending = _pendingCount.value
            if (pending <= 0) {
                _uiStatus.value = UiStatus.Online
                return
            }
            _uiStatus.value = UiStatus.Syncing(pendingOps = pending)
            val report = try {
                syncPending.execute()
            } catch (t: Throwable) {
                AbacoLog.e(LogCategory.POS, "OutboxSync drain error", t)
                _uiStatus.value = UiStatus.Offline(
                    reason = t.message ?: "Error al sincronizar",
                    pendingOps = _pendingCount.value,
                )
                return
            }
            if (report.attempted == 0) {
                _uiStatus.value = UiStatus.Online
                return
            }
            _uiStatus.value = UiStatus.SyncFinished(
                confirmed = report.confirmed,
                stillPending = report.stillPending,
                rejected = report.rejected,
            )
            dismissJob?.cancel()
            dismissJob = scope.launch {
                delay(4_000)
                if (_uiStatus.value is UiStatus.SyncFinished) {
                    _uiStatus.value = if (report.stillPending > 0) {
                        UiStatus.Offline(
                            reason = "Quedan operaciones sin confirmar",
                            pendingOps = report.stillPending,
                        )
                    } else {
                        UiStatus.Online
                    }
                }
            }
        }
    }
}
