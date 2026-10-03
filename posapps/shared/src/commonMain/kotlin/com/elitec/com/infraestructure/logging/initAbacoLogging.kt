package com.elitec.com.infraestructure.logging

/**
 * Inicializa Napier + trail de breadcrumbs.
 * Llamar una sola vez al arrancar (antes o junto a initKoin).
 */
fun initAbacoLogging() {
    initNapier()
    AbacoLog.clearBreadcrumbs()
    AbacoLog.i(LogCategory.APP, "Logging listo (Napier + AbacoLog)")
}

/** Platform: DebugAntilog en Android / JVM. */
expect fun initNapier()
