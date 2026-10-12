package com.elitec.com.feature.pos.data.sync

import com.elitec.com.feature.outbox.domain.usecases.ObservePendingOutboxCount
import com.elitec.com.feature.pos.domain.caseuse.SyncPendingOutboxOps
import com.elitec.com.infraestructure.logging.AbacoLog
import com.elitec.com.infraestructure.logging.LogCategory
import com.elitec.com.infraestructure.network.ServerConnectivityGuard
import com.elitec.com.infraestructure.network.ServerConnectivityState
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
 * Observa [ServerConnectivityGuard] y drena outbox al volver online.
 * Sin Compose. La UI se engancha vía [OutboxSyncViewModel].
 */
class OutboxSyncWorker(
    private val connectivity: ServerConnectivityGuard,
    private val syncPending: SyncPendingOutboxOps,
    private val observePendingCount: ObservePendingOutboxCount,
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

    private val _uiStatus = MutableStateFlow<UiStatus>(UiStatus.Unknown)
    val uiStatus: StateFlow<UiStatus> = _uiStatus.asStateFlow()

    private val _pendingCount = MutableStateFlow(0)
    val pendingCount: StateFlow<Int> = _pendingCount.asStateFlow()

    fun start() {
        if (started) return
        started = true
        AbacoLog.i(LogCategory.POS, "OutboxSyncWorker start")

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
            var previous: ServerConnectivityState = ServerConnectivityState.Unknown
            connectivity.state.collect { state ->
                when (state) {
                    is ServerConnectivityState.Unreachable -> {
                        _uiStatus.value = UiStatus.Offline(
                            reason = state.reason,
                            pendingOps = _pendingCount.value,
                        )
                        previous = state
                    }
                    is ServerConnectivityState.Ok -> {
                        val cameOnline =
                            previous is ServerConnectivityState.Unreachable ||
                                previous is ServerConnectivityState.Unknown
                        previous = state
                        if (cameOnline) {
                            AbacoLog.i(LogCategory.POS, "Connectivity OK → drain outbox")
                            drainAndPublish()
                        } else if (
                            _uiStatus.value !is UiStatus.Syncing &&
                            _uiStatus.value !is UiStatus.SyncFinished
                        ) {
                            _uiStatus.value = UiStatus.Online
                        }
                    }
                    is ServerConnectivityState.Unknown -> previous = state
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

    private suspend fun drainAndPublish() {
        drainMutex.withLock {
            val pending = _pendingCount.value
            _uiStatus.value = UiStatus.Syncing(pendingOps = maxOf(pending, 1))
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
                delay(5_000)
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
