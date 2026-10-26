package com.elitec.com.infraestructure.network

/**
 * Política de turno offline (roadmap fase 02).
 *
 * - Mientras la sesión está Active y el fallo es de **transporte** (no misconfig URL):
 *   el POS **siempre puede vender** vía outbox, sin forzar login.
 * - [OFFLINE_SHIFT_MS] (~6 h) es la ventana de un corte típico: a partir de ahí
 *   la UI debe mostrar aviso **fuerte pero no bloqueante** (modo degradado extendido).
 * - Solo misconfig de URL / health path incorrecto justifica UI bloqueante (Cambiar URL).
 *
 * Riesgo residual documentado: posible sobreventa offline hasta sync si varias cajas
 * comparten el mismo PDV sin coordinación.
 */
object OfflineShiftPolicy {
    /** 6 horas — alineado con [ServerConnectivityState.OFFLINE_SHIFT_MS]. */
    const val SHIFT_MS: Long = ServerConnectivityState.OFFLINE_SHIFT_MS

    enum class Level {
        /** Red OK o offline reciente dentro de la ventana de turno. */
        Normal,
        /** Offline continuo ≥ 6 h: aviso fuerte, venta sigue permitida. */
        ExtendedOutage,
        /** URL/health mal configurados: sí puede bloquearse el flujo. */
        UrlMisconfig,
    }

    fun level(
        state: ServerConnectivityState,
        nowMs: Long = kotlin.time.Clock.System.now().toEpochMilliseconds(),
    ): Level = when (state) {
        is ServerConnectivityState.Ok, is ServerConnectivityState.Unknown -> Level.Normal
        is ServerConnectivityState.Unreachable -> {
            when {
                state.requiresBlockingUi -> Level.UrlMisconfig
                state.isLongOutage(nowMs) -> Level.ExtendedOutage
                else -> Level.Normal
            }
        }
    }

    /**
     * ¿Se puede registrar venta local (outbox) con esta conectividad?
     * true salvo misconfig de URL (el vendedor no debe “vender a la nada” sin servidor configurado).
     */
    fun allowsOfflineSale(state: ServerConnectivityState): Boolean =
        level(state) != Level.UrlMisconfig

    fun extendedOutageMessage(durationMs: Long): String {
        val hours = (durationMs / (60L * 60L * 1000L)).coerceAtLeast(1)
        return "Sin servidor desde hace ~${hours}h. Las ventas siguen en cola local; " +
            "sincronice al recuperar la red. Revise URL si el corte no es de infraestructura."
    }
}
