package com.elitec.com.feature.server_discovery

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.util.Log
import com.elitec.com.infraestructure.data.database.AppContextHolder
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext

/**
 * Android NSD/mDNS. Todos los pasos se escriben en Logcat con un tag estable
 * para que el diagnóstico no dependa de que Napier ya esté inicializado.
 */
actual class PlatformServerDiscovery actual constructor() {
    actual suspend fun discover(timeoutMillis: Long): List<DiscoveredServer> =
        withContext(Dispatchers.Main.immediate) {
            val tag = "AbacoPhy-Discovery"
            val serviceType = "_abacophy._tcp."
            val timeout = timeoutMillis.coerceIn(1_000L, 15_000L)
            val found = linkedMapOf<String, DiscoveredServer>()
            Log.i(tag, "DISCOVERY_START serviceType=$serviceType timeoutMs=$timeout")

            val context: Context = try {
                AppContextHolder.requireContext()
            } catch (e: Exception) {
                Log.e(tag, "CONTEXT_ERROR No se pudo obtener el contexto Android", e)
                throw e
            }

            val manager = context.getSystemService(Context.NSD_SERVICE) as? NsdManager
            if (manager == null) {
                val error = IllegalStateException("Android NSD service no disponible")
                Log.e(tag, "NSD_MANAGER_UNAVAILABLE", error)
                throw error
            }
            Log.i(tag, "NSD_MANAGER_READY sdk=${android.os.Build.VERSION.SDK_INT}")

            val listener = object : NsdManager.DiscoveryListener {
                override fun onDiscoveryStarted(regType: String) {
                    Log.i(tag, "DISCOVERY_CALLBACK_STARTED regType=$regType")
                }

                override fun onServiceFound(service: NsdServiceInfo) {
                    Log.i(tag, "SERVICE_FOUND name=${service.serviceName} type=${service.serviceType}")
                    if (!service.serviceType.trimEnd('.').equals(serviceType.trimEnd('.'), ignoreCase = true)) {
                        Log.w(tag, "SERVICE_IGNORED name=${service.serviceName} reason=type_mismatch expected=$serviceType actual=${service.serviceType}")
                        return
                    }

                    Log.i(tag, "SERVICE_RESOLVE_START name=${service.serviceName}")
                    try {
                        manager.resolveService(
                            service,
                            object : NsdManager.ResolveListener {
                                override fun onResolveFailed(serviceInfo: NsdServiceInfo, errorCode: Int) {
                                    Log.e(tag, "SERVICE_RESOLVE_FAILED name=${serviceInfo.serviceName} errorCode=$errorCode")
                                }

                                override fun onServiceResolved(serviceInfo: NsdServiceInfo) {
                                    val host = serviceInfo.host?.hostAddress
                                    val port = serviceInfo.port
                                    if (host.isNullOrBlank() || port !in 1..65535) {
                                        Log.e(tag, "SERVICE_RESOLVE_INVALID name=${serviceInfo.serviceName} host=$host port=$port")
                                        return
                                    }
                                    val key = "$host:$port"
                                    found[key] = DiscoveredServer(
                                        name = serviceInfo.serviceName.ifBlank { "AbacoPhy" },
                                        host = host,
                                        port = port,
                                    )
                                    Log.i(tag, "SERVICE_RESOLVED name=${serviceInfo.serviceName} host=$host port=$port candidate=$key")
                                }
                            },
                        )
                    } catch (e: Exception) {
                        Log.e(tag, "SERVICE_RESOLVE_THROW name=${service.serviceName}", e)
                    }
                }

                override fun onServiceLost(service: NsdServiceInfo) {
                    Log.w(tag, "SERVICE_LOST name=${service.serviceName} type=${service.serviceType}")
                    service.host?.hostAddress?.let { host ->
                        found.remove("$host:${service.port}")
                    }
                }

                override fun onDiscoveryStopped(serviceType: String) {
                    Log.i(tag, "DISCOVERY_CALLBACK_STOPPED serviceType=$serviceType")
                }

                override fun onStartDiscoveryFailed(serviceType: String, errorCode: Int) {
                    Log.e(tag, "DISCOVERY_START_FAILED serviceType=$serviceType errorCode=$errorCode")
                    runCatching { manager.stopServiceDiscovery(this) }
                        .onFailure { Log.w(tag, "DISCOVERY_STOP_AFTER_START_FAILURE_FAILED", it) }
                }

                override fun onStopDiscoveryFailed(serviceType: String, errorCode: Int) {
                    Log.e(tag, "DISCOVERY_STOP_FAILED serviceType=$serviceType errorCode=$errorCode")
                    runCatching { manager.stopServiceDiscovery(this) }
                        .onFailure { Log.w(tag, "DISCOVERY_STOP_RETRY_FAILED", it) }
                }
            }

            var started = false
            try {
                Log.i(tag, "DISCOVERY_REQUEST serviceType=$serviceType protocol=DNS_SD")
                manager.discoverServices(serviceType, NsdManager.PROTOCOL_DNS_SD, listener)
                started = true
                Log.i(tag, "DISCOVERY_WAITING timeoutMs=$timeout")
                delay(timeout)
            } catch (e: Exception) {
                Log.e(tag, "DISCOVERY_EXCEPTION", e)
            } finally {
                if (started) {
                    Log.i(tag, "DISCOVERY_STOP_REQUEST")
                    runCatching { manager.stopServiceDiscovery(listener) }
                        .onFailure { Log.e(tag, "DISCOVERY_STOP_EXCEPTION", it) }
                }
            }

            val result = found.values.toList()
            Log.i(tag, "DISCOVERY_FINISHED candidates=${result.size} details=${result.joinToString { "${it.name}@${it.host}:${it.port}" }}")
            result
        }
}
