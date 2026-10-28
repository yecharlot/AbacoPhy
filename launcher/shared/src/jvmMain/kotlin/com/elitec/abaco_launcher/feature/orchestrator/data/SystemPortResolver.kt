package com.elitec.abaco_launcher.feature.orchestrator.data

import com.elitec.abaco_launcher.feature.orchestrator.domain.repositories.PortResolver
import com.elitec.abaco_launcher.infrastructure.config.LauncherPaths
import java.io.File
import java.net.InetAddress
import java.net.ServerSocket

/**
 * Política de puertos del Launcher:
 * 1. Si el usuario indicó un puerto, se respeta estrictamente.
 * 2. Si no indicó uno, se intenta primero el último puerto operativo guardado.
 * 3. Si ese puerto ya está ocupado, se busca otro libre en el sistema.
 * 4. El último puerto se guarda solo después de que el backend responde health.
 */
class SystemPortResolver : PortResolver {
    private val wildcard = InetAddress.getByName("0.0.0.0")
    private val cacheFile: File
        get() = File(LauncherPaths.resolveDataDir(), "last-port.txt")

    override fun resolvePort(preferred: Int?): Int {
        if (preferred != null) {
            return requireFree(preferred)
        }

        val cached = readCachedPort()
        if (cached != null) {
            try {
                val port = requireFree(cached)
                return port
            } catch (_: Exception) {
                // La caché es una preferencia, no una dependencia.
                // Si está ocupada, continuamos con la política anterior.
            }
        }

        return findFreeSystemPort()
    }

    override fun rememberPort(port: Int) {
        require(port in 1..65535) { "Puerto fuera de rango: $port" }
        val target = cacheFile
        try {
            target.parentFile?.mkdirs()
            val temp = File(target.parentFile, "${target.name}.tmp")
            temp.writeText("$port\n", Charsets.UTF_8)
            if (!temp.renameTo(target)) {
                temp.copyTo(target, overwrite = true)
                temp.delete()
            }
        } catch (_: Exception) {
            // La caché no debe impedir que el Launcher funcione.
        }
    }

    private fun readCachedPort(): Int? {
        return try {
            cacheFile.takeIf { it.isFile }
                ?.readText(Charsets.UTF_8)
                ?.trim()
                ?.toIntOrNull()
                ?.takeIf { it in 1..65535 }
        } catch (_: Exception) {
            null
        }
    }

    private fun requireFree(port: Int): Int {
        require(port in 1..65535) { "Puerto fuera de rango: $port" }
        try {
            ServerSocket(port, 1, wildcard).use { socket ->
                return socket.localPort
            }
        } catch (e: Exception) {
            throw IllegalStateException(
                "El puerto $port no está disponible en 0.0.0.0 (${e.message}).",
                e,
            )
        }
    }

    private fun findFreeSystemPort(): Int =
        ServerSocket(0, 1, wildcard).use { socket -> socket.localPort }
}
