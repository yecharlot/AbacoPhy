package com.elitec.com.feature.server_discovery

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import com.elitec.com.infraestructure.data.database.AppContextHolder
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext

/**
 * Android NSD/mDNS. Escanea durante una ventana breve y resuelve los hosts
 * anunciados por el servidor Go como _abacophy._tcp.local.
 */
actual class PlatformServerDiscovery actual constructor() {
    actual suspend fun discover(timeoutMillis: Long): List<DiscoveredServer> =
        withContext(Dispatchers.Main.immediate) {
            val context: Context = AppContextHolder.requireContext()
            val manager = context.getSystemService(Context.NSD_SERVICE) as NsdManager
            val found = linkedMapOf<String, DiscoveredServer>()
            val serviceType = "_abacophy._tcp."

            val listener = object : NsdManager.DiscoveryListener {
                override fun onDiscoveryStarted(regType: String) = Unit
                override fun onServiceFound(service: NsdServiceInfo) {
                    if (!service.serviceType.trimEnd('.').equals(
                            serviceType.trimEnd('.'),
                            ignoreCase = true,
                        )
                    ) return

                    runCatching {
                        manager.resolveService(
                            service,
                            object : NsdManager.ResolveListener {
                                override fun onResolveFailed(
                                    serviceInfo: NsdServiceInfo,
                                    errorCode: Int,
                                ) = Unit

                                override fun onServiceResolved(serviceInfo: NsdServiceInfo) {
                                    val host = serviceInfo.host?.hostAddress ?: return
                                    if (host.isBlank() || serviceInfo.port !in 1..65535) return
                                    val key = "$host:${serviceInfo.port}"
                                    found[key] = DiscoveredServer(
                                        name = serviceInfo.serviceName.ifBlank { "AbacoPhy" },
                                        host = host,
                                        port = serviceInfo.port,
                                    )
                                }
                            },
                        )
                    }
                }

                override fun onServiceLost(service: NsdServiceInfo) {
                    service.host?.hostAddress?.let { host ->
                        found.remove("$host:${service.port}")
                    }
                }

                override fun onDiscoveryStopped(serviceType: String) = Unit
                override fun onStartDiscoveryFailed(serviceType: String, errorCode: Int) {
                    runCatching { manager.stopServiceDiscovery(this) }
                }
                override fun onStopDiscoveryFailed(serviceType: String, errorCode: Int) {
                    runCatching { manager.stopServiceDiscovery(this) }
                }
            }

            var started = false
            try {
                manager.discoverServices(
                    serviceType,
                    NsdManager.PROTOCOL_DNS_SD,
                    listener,
                )
                started = true
                delay(timeoutMillis.coerceIn(1_000L, 15_000L))
            } catch (_: Exception) {
                // El fallback manual sigue disponible si NSD está bloqueado/no soportado.
            } finally {
                if (started) runCatching { manager.stopServiceDiscovery(listener) }
            }
            found.values.toList()
        }
}
