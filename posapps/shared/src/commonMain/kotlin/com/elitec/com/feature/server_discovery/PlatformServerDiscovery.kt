package com.elitec.com.feature.server_discovery

/**
 * Servidor detectado en la red local. Los datos de discovery son candidatos,
 * no se consideran confiables hasta validar /api/v1/info.
 */
data class DiscoveredServer(
    val name: String,
    val host: String,
    val port: Int,
) {
    val baseUrl: String get() = "http://$host:$port/api/v1"
}

expect class PlatformServerDiscovery() {
    suspend fun discover(timeoutMillis: Long = 5_000L): List<DiscoveredServer>
}
