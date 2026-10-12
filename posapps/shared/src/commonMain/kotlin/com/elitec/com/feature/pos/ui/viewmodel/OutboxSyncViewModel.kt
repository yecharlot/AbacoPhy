package com.elitec.com.feature.pos.ui.viewmodel

import androidx.lifecycle.ViewModel
import com.elitec.com.feature.pos.data.sync.OutboxSyncWorker
import kotlinx.coroutines.flow.StateFlow

/**
 * Capa de presentación del worker de cola / conectividad.
 * La UI (a cargo del equipo de vistas) solo debe:
 *   val vm: OutboxSyncViewModel = koinViewModel()
 *   val status by vm.uiStatus.collectAsStateWithLifecycle()
 *   val pending by vm.pendingCount.collectAsStateWithLifecycle()
 *
 * No modifica navegación ni layout por sí mismo.
 */
class OutboxSyncViewModel(
    private val worker: OutboxSyncWorker,
) : ViewModel() {

    /** Estado de red + sync (Unknown / Online / Offline / Syncing / SyncFinished). */
    val uiStatus: StateFlow<OutboxSyncWorker.UiStatus> = worker.uiStatus

    /** Cantidad de ops PENDING|IN_FLIGHT (badge). */
    val pendingCount: StateFlow<Int> = worker.pendingCount

    init {
        worker.start()
    }

    /** Reintento manual de drenado de cola. */
    fun requestSync() = worker.requestSync()

    /** Oculta el resumen SyncFinished (vuelve a Online). */
    fun dismissSyncFinished() = worker.dismissSyncFinished()
}
