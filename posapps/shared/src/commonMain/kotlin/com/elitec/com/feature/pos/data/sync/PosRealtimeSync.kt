package com.elitec.com.feature.pos.data.sync

import com.elitec.com.feature.identity.domain.entities.SessionControl
import com.elitec.com.feature.identity.domain.repository.SessionRepository
import com.elitec.com.feature.pos.domain.caseuse.LoadPosSnapshotCaseUse
import com.elitec.com.feature.pos.domain.caseuse.SyncPendingOutboxOps
import com.elitec.com.feature.pos.domain.repository.SalesRepository
import com.elitec.com.feature.warehouse.domain.repository.WarehouseRepository
import com.elitec.com.infraestructure.logging.AbacoLog
import com.elitec.com.infraestructure.logging.LogCategory
import com.elitec.com.infraestructure.network.ServerEventStream
import com.elitec.com.infraestructure.network.ServerRealtimeEvent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/**
 * Reacciona a eventos SSE de negocio (p.ej. transferencia web → PDV).
 *
 * - [stock.transfer] / [inventory.updated]: refresca stock/unidades y emite
 *   [unitStockInvalidated] para que SalesViewModel actualice UI.
 * - No depende del vendedor: automático en cuanto llega el evento.
 */
class PosRealtimeSync(
    private val stream: ServerEventStream,
    private val sessions: SessionRepository,
    private val warehouse: WarehouseRepository,
    private val sales: SalesRepository,
    private val loadPosSnapshot: LoadPosSnapshotCaseUse,
    private val syncPending: SyncPendingOutboxOps,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private var job: Job? = null
    private val json = Json { ignoreUnknownKeys = true }

    private val _unitStockInvalidated = MutableSharedFlow<UnitStockInvalidate>(
        extraBufferCapacity = 8,
    )
    val unitStockInvalidated: SharedFlow<UnitStockInvalidate> =
        _unitStockInvalidated.asSharedFlow()

    data class UnitStockInvalidate(
        val unitId: String?,
        val reason: String,
        val transferNumber: String? = null,
    )

    fun start() {
        if (job?.isActive == true) return
        AbacoLog.i(LogCategory.POS, "PosRealtimeSync start")
        job = scope.launch {
            stream.events.collect { ev ->
                when (ev) {
                    is ServerRealtimeEvent.Message -> handleMessage(ev.event, ev.data)
                    else -> Unit
                }
            }
        }
    }

    fun stop() {
        job?.cancel()
        job = null
    }

    private suspend fun handleMessage(event: String, data: String) {
        val kind = event.trim().lowercase()
        if (kind != "stock.transfer" && kind != "inventory.updated") return

        val obj = runCatching {
            json.parseToJsonElement(data).jsonObject
        }.getOrNull()

        val unitId = obj?.get("unitId")?.jsonPrimitive?.contentOrNull
            ?: obj?.get("unit_id")?.jsonPrimitive?.contentOrNull
        val number = obj?.get("number")?.jsonPrimitive?.contentOrNull
        val lineCount = obj?.get("lineCount")?.jsonPrimitive?.contentOrNull

        AbacoLog.i(
            LogCategory.POS,
            "SSE $kind unitId=$unitId number=$number lines=$lineCount → refresh stock",
        )

        // Solo reaccionar si el PDV del usuario coincide (o el evento es global)
        val assigned = currentAssignedUnitIds()
        if (unitId != null && assigned.isNotEmpty() && unitId !in assigned) {
            AbacoLog.i(LogCategory.POS, "SSE $kind ignorado (unit $unitId no asignada a sesión)")
            return
        }

        // 1) Caché de almacén / unidades (stock del PDV)
        runCatching { warehouse.getStock() }
            .onFailure { AbacoLog.w(LogCategory.POS, "refresh getStock: ${it.message}") }
        runCatching { warehouse.getSalesUnits() }
            .onFailure { AbacoLog.w(LogCategory.POS, "refresh getSalesUnits: ${it.message}") }

        // 2) Snapshot POS + ventas (backend como fuente)
        runCatching {
            loadPosSnapshot(unitId ?: assigned.firstOrNull())
        }.onFailure { AbacoLog.w(LogCategory.POS, "refresh snapshot: ${it.message}") }

        runCatching {
            if (unitId.isNullOrBlank()) sales.getSales()
            else sales.getSalesByUnitId(unitId)
        }

        // 3) Si había cola offline, aprovechar red confirmada
        runCatching { syncPending.execute() }

        _unitStockInvalidated.emit(
            UnitStockInvalidate(
                unitId = unitId,
                reason = kind,
                transferNumber = number,
            ),
        )
    }

    private suspend fun currentAssignedUnitIds(): Set<String> {
        val state = sessions.sessionState.value
        val session = (state as? SessionControl.Active)?.session ?: return emptySet()
        val fromUser = session.user.assignedUnitIds()
        if (fromUser.isNotEmpty()) return fromUser.toSet()
        // metadata unitIds fallback ya suele estar en assignedUnitIds del mapper
        return emptySet()
    }
}
