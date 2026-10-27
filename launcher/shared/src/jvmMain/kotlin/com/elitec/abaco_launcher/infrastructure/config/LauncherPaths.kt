package com.elitec.abaco_launcher.infrastructure.config

import java.io.File
import java.net.URI

/**
 * Convenciones de rutas y variables de entorno del launcher.
 *
 * Prioridad de raíz de instalación:
 * 1. `ABACOPHY_HOME`
 * 2. system property `abacophy.home`
 * 3. directorio del JAR / classes (producción empaquetada)
 * 4. `user.dir` si contiene `runtime/`
 * 5. `user.dir/launcher` (monorepo)
 * 6. `user.dir`
 */
object LauncherPaths {
    const val ENV_HOME = "ABACOPHY_HOME"
    const val ENV_BIN = "ABACOPHY_BIN"
    const val ENV_STATIC = "ABACOPHY_STATIC"
    const val ENV_DATA = "ABACOPHY_DATA"
    const val ENV_PORT = "PORT"
    const val PROP_HOME = "abacophy.home"

    /** Datos locales del negocio (no efímeros del instalador). */
    fun defaultDataDir(): File {
        val home = System.getProperty("user.home") ?: "."
        return File(home, ".abacophy/data")
    }

    /**
     * Raíz donde se espera el layout:
     * ```
     * <install>/
     *   runtime/bin/abacophy[.exe]
     *   runtime/static/
     * ```
     */
    fun installRoot(): File {
        System.getenv(ENV_HOME)?.takeIf { it.isNotBlank() }?.let { return File(it).canonicalFile }
        System.getProperty(PROP_HOME)?.takeIf { it.isNotBlank() }?.let { return File(it).canonicalFile }

        fromCodeSource()?.let { return it }

        val cwd = File(System.getProperty("user.dir") ?: ".").canonicalFile
        if (File(cwd, "runtime").isDirectory) return cwd
        val nested = File(cwd, "launcher")
        if (File(nested, "runtime").isDirectory) return nested.canonicalFile
        // Monorepo: cwd = repo root
        if (File(cwd, "cmd/abacophy").exists() && File(cwd, "launcher").isDirectory) {
            return File(cwd, "launcher").canonicalFile
        }
        return cwd
    }

    private fun fromCodeSource(): File? {
        return try {
            val url = LauncherPaths::class.java.protectionDomain?.codeSource?.location ?: return null
            val file = File(URI(url.toString())).canonicalFile
            // .../app/lib/app.jar → app/
            // .../build/classes/kotlin/jvm/main → walk up looking for runtime/
            var dir = if (file.isFile) file.parentFile else file
            repeat(8) {
                if (dir == null) return@repeat
                if (File(dir, "runtime").isDirectory) return dir
                // Compose native dist often: <app>/lib/*.jar
                if (dir.name == "lib" && File(dir.parentFile, "runtime").isDirectory) {
                    return dir.parentFile
                }
                dir = dir.parentFile
            }
            null
        } catch (_: Exception) {
            null
        }
    }

    fun defaultRuntimeRoot(): File = File(installRoot(), "runtime")

    fun defaultBinary(): File {
        val root = defaultRuntimeRoot()
        val isWin = System.getProperty("os.name").orEmpty().lowercase().contains("win")
        return File(root, if (isWin) "bin/abacophy.exe" else "bin/abacophy")
    }

    fun defaultStaticDir(): File = File(defaultRuntimeRoot(), "static")

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
