package com.elitec.abaco_launcher.infrastructure.config

import java.io.File
import java.net.URI

/**
 * Rutas del launcher.
 *
 * IMPORTANTE: NO usar el nombre de carpeta `runtime/` junto al .exe empaquetado.
 * Compose Desktop / jpackage reserva `runtime/` para el **JRE embebido**.
 * Si se copia el backend Go ahí, se rompe la JVM → "Failed to launch JVM".
 *
 * Layout instalado:
 * ```
 * AbacoLauncher/
 *   AbacoLauncher.exe
 *   runtime/          ← JRE (Compose) — no tocar
 *   app/
 *   backend/          ← Go + static web
 *     bin/abacophy.exe
 *     static/
 * ```
 *
 * En desarrollo monorepo sigue existiendo `launcher/runtime/` (solo dev);
 * [defaultBackendRoot] también lo acepta como fallback.
 */
object LauncherPaths {
    const val ENV_HOME = "ABACOPHY_HOME"
    const val ENV_BIN = "ABACOPHY_BIN"
    const val ENV_STATIC = "ABACOPHY_STATIC"
    const val ENV_DATA = "ABACOPHY_DATA"
    const val ENV_PORT = "PORT"
    const val PROP_HOME = "abacophy.home"
    const val PROP_COMPOSE_RESOURCES = "compose.application.resources.dir"

    /** Nombre de carpeta del backend Go en el instalador (≠ JRE). */
    const val BACKEND_DIR = "backend"

    fun defaultDataDir(): File {
        val home = System.getProperty("user.home") ?: "."
        return File(home, ".abacophy/data")
    }

    fun installRoot(): File {
        System.getenv(ENV_HOME)?.takeIf { it.isNotBlank() }?.let { return File(it).canonicalFile }
        System.getProperty(PROP_HOME)?.takeIf { it.isNotBlank() }?.let { return File(it).canonicalFile }

        composeResourcesBackendParent()?.let { return it }
        fromCodeSource()?.let { return it }

        val cwd = File(System.getProperty("user.dir") ?: ".").canonicalFile
        if (hasBackendLayout(cwd)) return cwd
        // Dev: launcher/runtime o launcher/backend
        val nested = File(cwd, "launcher")
        if (hasBackendLayout(nested)) return nested.canonicalFile
        if (File(cwd, "cmd/abacophy").exists() && File(cwd, "launcher").isDirectory) {
            return File(cwd, "launcher").canonicalFile
        }
        return cwd
    }

    private fun hasBackendLayout(dir: File): Boolean {
        if (File(dir, BACKEND_DIR).isDirectory) return true
        // Solo en desarrollo: launcher/runtime histórico
        if (File(dir, "runtime/bin").isDirectory) return true
        return false
    }

    private fun composeResourcesBackendParent(): File? {
        val res = System.getProperty(PROP_COMPOSE_RESOURCES)?.takeIf { it.isNotBlank() } ?: return null
        val resDir = File(res).canonicalFile
        if (File(resDir, BACKEND_DIR).isDirectory) return resDir
        if (File(resDir, "bin").isDirectory) {
            return resDir.parentFile ?: resDir
        }
        return null
    }

    private fun fromCodeSource(): File? {
        return try {
            val url = LauncherPaths::class.java.protectionDomain?.codeSource?.location ?: return null
            val file = File(URI(url.toString())).canonicalFile
            var dir = if (file.isFile) file.parentFile else file
            repeat(10) {
                if (dir == null) return@repeat
                if (hasBackendLayout(dir)) return dir
                if (dir.name == "lib" && hasBackendLayout(dir.parentFile)) return dir.parentFile
                if (dir.name == "app" && hasBackendLayout(dir.parentFile)) return dir.parentFile
                dir = dir.parentFile
            }
            null
        } catch (_: Exception) {
            null
        }
    }

    /**
     * Raíz del backend Go (bin + static).
     * Preferencia: backend/ → resources → runtime/ (solo dev).
     */
    fun defaultBackendRoot(): File {
        val res = System.getProperty(PROP_COMPOSE_RESOURCES)?.takeIf { it.isNotBlank() }
        if (res != null) {
            val resDir = File(res).canonicalFile
            val asBackend = File(resDir, BACKEND_DIR)
            if (asBackend.isDirectory) return asBackend
            if (File(resDir, "bin").isDirectory) return resDir
        }
        val root = installRoot()
        val packaged = File(root, BACKEND_DIR)
        if (packaged.isDirectory) return packaged
        // Desarrollo: scripts/build-runtime escribe en launcher/runtime
        val devRuntime = File(root, "runtime")
        if (File(devRuntime, "bin").isDirectory) return devRuntime
        return packaged
    }

    /** @deprecated use defaultBackendRoot — evita confusión con JRE `runtime/`. */
    fun defaultRuntimeRoot(): File = defaultBackendRoot()

    fun defaultBinary(): File {
        val root = defaultBackendRoot()
        val isWin = System.getProperty("os.name").orEmpty().lowercase().contains("win")
        return File(root, if (isWin) "bin/abacophy.exe" else "bin/abacophy")
    }

    fun defaultStaticDir(): File = File(defaultBackendRoot(), "static")

    fun resolveBinary(): File {
        val fromEnv = System.getenv(ENV_BIN)
        if (!fromEnv.isNullOrBlank()) return File(fromEnv).canonicalFile
        return defaultBinary()
    }

    fun resolveStaticDir(): File {
        val fromEnv = System.getenv(ENV_STATIC)
        if (!fromEnv.isNullOrBlank()) return File(fromEnv).canonicalFile
        return defaultStaticDir()
    }

    fun resolveDataDir(): File {
        val fromEnv = System.getenv(ENV_DATA)
        if (!fromEnv.isNullOrBlank()) return File(fromEnv).canonicalFile
        return defaultDataDir()
    }
}
