package com.elitec.abaco_launcher.feature.orchestrator.domain.models

/**
 * Interfaz LAN detectada por Launcher.
 * interfaceName identifica el adaptador; address es informativa y se vuelve a resolver al iniciar.
 */
data class LanInterfaceOption(
    val interfaceName: String,
    val displayName: String,
    val address: String,
)
