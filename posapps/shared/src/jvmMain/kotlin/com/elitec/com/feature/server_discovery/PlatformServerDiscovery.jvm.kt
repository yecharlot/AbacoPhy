package com.elitec.com.feature.server_discovery

import io.github.aakira.napier.Napier
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.Inet4Address
import java.net.NetworkInterface
import java.util.Collections
import javax.jmdns.JmDNS

/**
 * Descubrimiento mDNS exclusivo de Desktop/JVM.
 *
 * Solo intenta interfaces IPv4 que el sistema operativo declara aptas para
 * multicast. Esto evita abrir JmDNS sobre adaptadores virtuales/VPN que
 * fallan al configurar el socket multicast en Windows.
 *
 * El ViewModel común sigue validando /health y /info; Android no se modifica.
 */
actual class PlatformServerDiscovery actual constructor() {
    actual suspend fun discover(timeoutMillis: Long): List<DiscoveredServer> =
        withContext(Dispatchers.IO) {
            val timeout = timeoutMillis.coerceIn(MIN_TIMEOUT_MS, MAX_TIMEOUT_MS)
            val candidates = linkedMapOf<String, DiscoveredServer>()
            val interfaces = runCatching {
                Collections.list(NetworkInterface.getNetworkInterfaces())
                    .filter { networkInterface ->
                        runCatching {
                            networkInterface.isUp &&
                                !networkInterface.isLoopback &&
                                networkInterface.supportsMulticast()
                        }.getOrDefault(false)
                    }
                    .flatMap { networkInterface ->
                        Collections.list(networkInterface.inetAddresses)
                            .filterIsInstance<Inet4Address>()
                            .filter { address ->
                                !address.isLoopbackAddress && !address.isLinkLocalAddress
                            }
                    }
                    .distinctBy { it.hostAddress }
            }.onFailure {
                Napier.w("DISCOVERY_INTERFACES_FAILED message=${it.message}", it, tag = TAG)
            }.getOrDefault(emptyList())

            if (interfaces.isEmpty()) {
                Napier.w("DISCOVERY_NO_MULTICAST_IPV4_INTERFACE", tag = TAG)
                return@withContext emptyList()
            }

            for (address in interfaces) {
                var discovery: JmDNS? = null
                try {
                    Napier.i("DISCOVERY_INTERFACE_START address=${address.hostAddress}", tag = TAG)
                    discovery = JmDNS.create(address)
                    val services = discovery.list(SERVICE_TYPE, timeout)
                    services.forEach { service ->
                        if (service.port !in 1..65535) return@forEach
                        service.hostAddresses
                            .filter { it.isNotBlank() && isIpv4Literal(it) }
                            .forEach { host ->
                                val server = DiscoveredServer(
                                    name = service.name.ifBlank { "AbacoPhy" },
                                    host = host,
                                    port = service.port,
                                )
                                candidates.putIfAbsent(server.baseUrl, server)
                            }
                    }
                } catch (e: Exception) {
                    Napier.w(
                        "DISCOVERY_INTERFACE_FAILED address=${address.hostAddress} type=${e::class.simpleName} message=${e.message}",
                        e,
                        tag = TAG,
                    )
                } finally {
                    runCatching { discovery?.close() }
                        .onFailure {
                            Napier.w("DISCOVERY_CLOSE_FAILED address=${address.hostAddress}", it, tag = TAG)
                        }
                }
            }

            Napier.i(
                "DISCOVERY_FINISHED interfaces=${interfaces.size} candidates=${candidates.size}",
                tag = TAG,
            )
            candidates.values.toList()
        }

    private fun isIpv4Literal(host: String): Boolean =
        host.matches(Regex("""^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$"""))

    private companion object {
        const val TAG = "AbacoPhy-Discovery"
        const val SERVICE_TYPE = "_abacophy._tcp.local."
        const val MIN_TIMEOUT_MS = 1_000L
        const val MAX_TIMEOUT_MS = 15_000L
    }
}
