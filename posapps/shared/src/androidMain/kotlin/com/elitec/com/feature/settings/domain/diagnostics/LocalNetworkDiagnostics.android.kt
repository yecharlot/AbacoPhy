package com.elitec.com.feature.settings.domain.diagnostics

/**
 * Android: sin diagnóstico de firewall del PC servidor (fuera de alcance).
 */
actual class LocalNetworkDiagnostics actual constructor() {
    actual suspend fun diagnose(ports: List<Int>): ConnectionDiagnosis =
        ConnectionDiagnosis(
            kind = DiagnosisKind.NotApplicable,
            title = "",
            detail = "",
            steps = emptyList(),
        )
}
