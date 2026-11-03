package com.elitec.com.feature.settings.domain.diagnostics

import io.github.aakira.napier.Napier
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.Inet4Address
import java.net.NetworkInterface
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Duration
import java.util.Collections

/**
 * Desktop: infiere si el problema es proceso caído, uso de localhost, firewall o VPN.
 */
actual class LocalNetworkDiagnostics actual constructor() {

    actual suspend fun diagnose(ports: List<Int>): ConnectionDiagnosis =
        withContext(Dispatchers.IO) {
            val portList = ports
                .filter { it in 1..65535 }
                .distinct()
                .ifEmpty { listOf(8090) }

            Napier.i("DIAG_START ports=$portList", tag = TAG)

            var loopbackOk = false
            var loopbackUrl: String? = null
            for (port in portList) {
                val base = "http://127.0.0.1:$port/api/v1"
                if (probeHealth(base)) {
                    loopbackOk = true
                    loopbackUrl = base
                    Napier.i("DIAG_LOOPBACK_OK url=$base", tag = TAG)
                    break
                }
            }

            val lanIps = localLanIpv4()
            Napier.i("DIAG_LAN_IPS ips=$lanIps", tag = TAG)

            var lanOk = false
            for (ip in lanIps) {
                for (port in portList) {
                    val base = "http://$ip:$port/api/v1"
                    if (probeHealth(base)) {
                        lanOk = true
                        Napier.i("DIAG_LAN_OK url=$base", tag = TAG)
                        break
                    }
                }
                if (lanOk) break
            }

            when {
                loopbackOk && !lanOk -> firewallDiagnosis(loopbackUrl, portList)
                loopbackOk && lanOk ->
                    ConnectionDiagnosis(
                        kind = DiagnosisKind.LoopbackOkUseLocalhost,
                        title = "El servidor responde en este PC",
                        detail = "mDNS puede haber fallado (VPN o multicast). Use la URL local o la de la LAN.",
                        steps = listOf(
                            "En este mismo equipo use: ${loopbackUrl ?: "http://127.0.0.1:8090/api/v1"}",
                            "Si un móvil en la misma WiFi no conecta, revise firewall de Windows (entrada TCP al puerto).",
                            "Si hay VPN activa, desactívela y pulse Buscar de nuevo.",
                        ),
                        suggestedBaseUrl = loopbackUrl,
                        loopbackHealthOk = true,
                        lanHealthOk = true,
                        portsTried = portList,
                    )
                !loopbackOk && !lanOk ->
                    ConnectionDiagnosis(
                        kind = DiagnosisKind.BackendLikelyDown,
                        title = "No hay API AbacoPhy respondiendo en este equipo",
                        detail = "Ni 127.0.0.1 ni la IP de red contestan /api/v1/health en los puertos probados.",
                        steps = listOf(
                            "Arranque el Orquestador o el backend Go y pulse Iniciar.",
                            "Confirme el puerto en la consola del orquestador (ej. 8090).",
                            "Pruebe en el navegador: http://127.0.0.1:PUERTO/api/v1/health",
                            "Si el servidor está en otra PC, escriba su URL manualmente (http://IP:PUERTO/api/v1).",
                            "Si usa VPN, desactívela e intente otra vez (puede bloquear el descubrimiento).",
                        ),
                        suggestedBaseUrl = null,
                        loopbackHealthOk = false,
                        lanHealthOk = false,
                        portsTried = portList,
                    )
                else ->
                    ConnectionDiagnosis(
                        kind = DiagnosisKind.LikelyVpnOrNetwork,
                        title = "Red o VPN pueden estar interfiriendo",
                        detail = "No se pudo clasificar con certeza. Pruebe sin VPN y con URL manual.",
                        steps = listOf(
                            "Desactive VPN temporalmente.",
                            "Use URL manual: http://127.0.0.1:PUERTO/api/v1 en el mismo PC.",
                            "Desde otro dispositivo use http://IP-LAN:PUERTO/api/v1",
                        ),
                        portsTried = portList,
                    )
            }
        }

    private fun firewallDiagnosis(loopbackUrl: String?, ports: List<Int>): ConnectionDiagnosis {
        val portLabel = ports.joinToString(", ")
        return ConnectionDiagnosis(
            kind = DiagnosisKind.LikelyFirewall,
            title = "Muy probable: firewall bloqueando el puerto",
            detail = "El API responde en 127.0.0.1 pero no en la IP de red. Suele ser el firewall de este PC.",
            steps = listOf(
                "En este PC puede entrar ya con: ${loopbackUrl ?: "http://127.0.0.1:8090/api/v1"}",
                "Windows: Configuración → Firewall → Reglas de entrada → Nueva regla → Puerto TCP → $portLabel → Permitir.",
                "O permita la app «abacophy» / el Orquestador en redes privadas.",
                "Desactive VPN si está activa y vuelva a buscar.",
                "Reinicie el backend y pulse «Buscar servidores» o «Validar y conectar».",
            ),
            suggestedBaseUrl = loopbackUrl,
            loopbackHealthOk = true,
            lanHealthOk = false,
            portsTried = ports,
        )
    }

    private fun probeHealth(baseApiV1: String): Boolean {
        val url = baseApiV1.trimEnd('/') + "/health"
        return try {
            val client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(800))
                .build()
            val request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofMillis(1200))
                .GET()
                .build()
            val response = client.send(request, HttpResponse.BodyHandlers.discarding())
            val ok = response.statusCode() in 200..299
            Napier.d("DIAG_PROBE url=$url status=${response.statusCode()} ok=$ok", tag = TAG)
            ok
        } catch (e: Exception) {
            Napier.d("DIAG_PROBE_FAIL url=$url msg=${e.message}", tag = TAG)
            false
        }
    }

    private fun localLanIpv4(): List<String> {
        return runCatching {
            Collections.list(NetworkInterface.getNetworkInterfaces())
                .filter { ni ->
                    runCatching { ni.isUp && !ni.isLoopback }.getOrDefault(false)
                }
                .flatMap { ni -> Collections.list(ni.inetAddresses) }
                .filterIsInstance<Inet4Address>()
                .mapNotNull { it.hostAddress }
                .filter { !it.startsWith("127.") }
                .distinct()
        }.getOrDefault(emptyList())
    }

    companion object {
        private const val TAG = "AbacoPhy-Diag"
    }
}
