package com.elitec.com.feature.server_discovery

/**
 * La búsqueda NSD está disponible en Android. Desktop conserva el flujo de URL
 * manual hasta que se defina un descubridor específico para JVM.
 */
actual class PlatformServerDiscovery actual constructor() {
    actual suspend fun discover(timeoutMillis: Long): List<DiscoveredServer> = emptyList()
}
