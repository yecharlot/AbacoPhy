package com.elitec.abaco_launcher.feature.orchestrator.domain.repositories

/**
 * Contrato: puerto en loopback.
 * [preferred] si es válido y libre se usa; si no, puerto efímero del sistema.
 */
interface PortResolver {
    /**
     * @param preferred puerto pedido por el usuario (null = dejar al SO)
     */
    fun resolvePort(preferred: Int? = null): Int

    /** Solo puerto libre del sistema (compat). */
    fun findFreePort(): Int = resolvePort(null)
}
