package com.elitec.abaco_launcher.feature.orchestrator.data

import com.elitec.abaco_launcher.feature.orchestrator.domain.repositories.PortResolver
import java.net.InetAddress
import java.net.ServerSocket

/**
 * Puerto preferido si está libre en 0.0.0.0 (todas las interfaces); si no, efímero del sistema.
 */
class SystemPortResolver : PortResolver {
    override fun resolvePort(preferred: Int?): Int {
        val wildcard = InetAddress.getByName("0.0.0.0")
        if (preferred != null) {
            require(preferred in 1..65535) { "Puerto fuera de rango: $preferred" }
            try {
                ServerSocket(preferred, 1, wildcard).use { socket ->
                    return socket.localPort
                }
            } catch (e: Exception) {
                throw IllegalStateException(
                    "El puerto $preferred no está disponible en 0.0.0.0 (${e.message}). " +
                        "Elige otro o deja el campo vacío para que el sistema asigne uno libre.",
                    e,
                )
            }
        }
        ServerSocket(0, 1, wildcard).use { socket ->
            return socket.localPort
        }
    }
}
