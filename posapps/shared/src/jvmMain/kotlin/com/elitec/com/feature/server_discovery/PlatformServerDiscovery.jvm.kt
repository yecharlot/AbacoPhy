package com.elitec.com.feature.server_discovery

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.jmdns.JmDNS

/**
 * Descubrimiento mDNS para Desktop/JVM.
 *
 * Mantiene el mismo contrato que Android NSD: busca _abacophy._tcp.local.,
 * devuelve candidatos y deja la validación HTTP (/health + /info) al
 * InitialSetupViewModel antes de guardar o usar una URL.
 */
actual class PlatformServerDiscovery actual constructor() {
    actual suspend fun discover(timeoutMillis: Long): List<DiscoveredServer> =
        withContext(Dispatchers.IO) {
            val timeout = timeoutMillis.coerceIn(MIN_TIMEOUT_MS, MAX_TIMEOUT_MS).toInt()
            val discovery = JmDNS.create()
            try {
                discovery
                    .list(SERVICE_TYPE, timeout)
                    .asSequence()
                    .filter { it.port in 1..65535 }
                    .flatMap { service ->
                        service.hostAddresses
                            .asSequence()
                            .filter { it.isNotBlank() }
                            .map { host ->
                                DiscoveredServer(
                                    name = service.name.ifBlank { "AbacoPhy" },
                                    host = host,
                                    port = service.port,
                                )
                            }
                    }
                    .distinctBy { it.baseUrl }
                    .toList()
            } finally {
                runCatching { discovery.close() }
            }
        }

    private companion object {
        const val SERVICE_TYPE = "_abacophy._tcp.local."
        const val MIN_TIMEOUT_MS = 1_000L
        const val MAX_TIMEOUT_MS = 15_000L
    }
}
