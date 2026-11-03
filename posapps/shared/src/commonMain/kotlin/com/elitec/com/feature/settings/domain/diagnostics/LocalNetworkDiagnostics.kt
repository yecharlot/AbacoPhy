package com.elitec.com.feature.settings.domain.diagnostics

/**
 * Expect/actual: en Desktop (JVM) ejecuta health loopback + LAN.
 * En Android no aplica (no-op).
 */
expect class LocalNetworkDiagnostics() {
    /**
     * @param ports puertos a probar (p.ej. 8090 y el del último intento)
     */
    suspend fun diagnose(ports: List<Int> = listOf(8090)): ConnectionDiagnosis
}
