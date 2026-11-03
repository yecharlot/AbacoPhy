package com.elitec.abaco_launcher.feature.orchestrator.domain.repositories

/**
 * Contrato: puerto en loopback.
 * [preferred] si es válido y libre se usa; si no, puerto efímero del sistema.
 */
interface PortResolver {
    /**
     * @param preferred puerto pedido por el usuario (null = usar política de caché/SO)
     */
    fun resolvePort(preferred: Int? = null): Int

    /**
     * Persiste el último puerto que realmente quedó operativo.
     * Las plataformas que no necesitan caché pueden ignorarlo.
     */
    fun rememberPort(port: Int) = Unit

    /** Solo puerto libre del sistema (compat). */
    fun findFreePort(): Int = resolvePort(null)
}
