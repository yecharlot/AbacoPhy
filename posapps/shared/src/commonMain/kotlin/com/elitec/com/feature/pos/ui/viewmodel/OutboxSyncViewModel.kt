package com.elitec.com.feature.pos.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.elitec.com.feature.identity.domain.entities.SessionControl
import com.elitec.com.feature.identity.domain.repository.SessionRepository
import com.elitec.com.feature.pos.data.sync.OutboxSyncWorker
import com.elitec.com.feature.pos.data.sync.PosRealtimeSync
import com.elitec.com.infraestructure.network.ServerEventStream
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

/**
 * Worker de cola + canal SSE de recuperación.
 * La UI solo observa [uiStatus] / [pendingCount]; el drenado es automático.
 */
class OutboxSyncViewModel(
    private val worker: OutboxSyncWorker,
    private val eventStream: ServerEventStream,
    private val sessions: SessionRepository,
    private val realtimeSync: PosRealtimeSync,
) : ViewModel() {

    val uiStatus: StateFlow<OutboxSyncWorker.UiStatus> = worker.uiStatus
    val pendingCount: StateFlow<Int> = worker.pendingCount

    init {
        worker.start()
        viewModelScope.launch {
            sessions.sessionState.collect { state ->
                when (state) {
                    is SessionControl.Active -> {
                        eventStream.start()
                        realtimeSync.start()
                    }
                    else -> {
                        realtimeSync.stop()
                        eventStream.stop()
                    }
                }
            }
        }
    }

    fun requestSync() = worker.requestSync()

    fun dismissSyncFinished() = worker.dismissSyncFinished()

    override fun onCleared() {
        realtimeSync.stop()
        eventStream.stop()
        super.onCleared()
    }
}
