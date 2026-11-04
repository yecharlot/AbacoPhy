package com.elitec.abaco_launcher.feature.orchestrator.data

import com.elitec.abaco_launcher.feature.orchestrator.domain.repositories.BackendProcess
import com.elitec.abaco_launcher.infrastructure.config.LauncherPaths
import java.io.BufferedReader
import java.io.File
import java.io.InputStreamReader
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicReference
import kotlin.concurrent.thread

/**
 * Clasifica líneas del binario Go.
 *
 * El package `log` de Go escribe por defecto a **stderr**. Eso no implica error:
 * presence, EVENT=http.request, auth.login, etc. son INFO operativos.
 */
internal fun classifyGoLogLine(raw: String): String {
    val line = raw.trim()
    val upper = line.uppercase()
    if (upper.contains("FATAL") || upper.contains("PANIC")) return "ERROR"
    // Palabra ERROR de nivel (evita falsos positivos raros en paths)
    if (Regex("""\bERROR\b""").containsMatchIn(upper)) return "ERROR"
    if (upper.contains("WARN") || upper.contains("WARNING")) return "WARN"
    if (upper.contains("DEBUG") || upper.contains("TRACE")) return "DEBUG"
    return "INFO"
}

/**
 * Lanza `abacophy` vía [ProcessBuilder], reenvía logs y detiene sin zombies.
 * Cada línea se prefija con timestamp HH:mm:ss y nivel derivado del **contenido**.
 */

private fun encodeJsonString(value: String): String = buildString {
    append('"')
    value.forEach { ch ->
        when (ch) {
            '"' -> append("\\\"")
            '\\\\' -> append("\\\\\\\\")
            '\\n' -> append("\\\\n")
            '\\r' -> append("\\\\r")
            '\\t' -> append("\\\\t")
            else -> append(ch)
        }
    }
    append('"')
}

class GoProcessLauncher : BackendProcess {
    private val processRef = AtomicReference<Process?>(null)
    private val exitCodeRef = AtomicInteger(Int.MIN_VALUE) // MIN = never set

    private val timeFmt: DateTimeFormatter = DateTimeFormatter.ofPattern("HH:mm:ss")

    private fun ts(): String = LocalTime.now().format(timeFmt)

    override fun start(
        port: Int,
        dataDir: String,
        staticDir: String,
        binaryPath: String,
        networkScope: String,
        corsAllowedOrigins: List<String>,
        onLog: (String) -> Unit,
    ) {
        stop()
        exitCodeRef.set(Int.MIN_VALUE)

        val binary = File(binaryPath)
        if (!binary.isFile) {
            throw IllegalStateException(
                "Binario Go no encontrado:\n  ${binary.absolutePath}\n" +
                    "Ejecuta ./scripts/build-runtime.sh o define ${LauncherPaths.ENV_BIN}.",
            )
        }
        if (!binary.canExecute()) {
            val ok = binary.setExecutable(true, false)
            if (!ok && !binary.canExecute()) {
                throw IllegalStateException(
                    "Binario sin permiso de ejecución: ${binary.absolutePath}",
                )
            }
        }

        File(dataDir).mkdirs()
        File(staticDir).mkdirs()
        if (!File(dataDir).isDirectory) {
            throw IllegalStateException("No se pudo crear ABACOPHY_DATA: $dataDir")
        }

        val pb = ProcessBuilder(binary.absolutePath)
            .redirectErrorStream(false)
            .directory(binary.parentFile)

        val env = pb.environment()
        env[LauncherPaths.ENV_PORT] = port.toString()
        env[LauncherPaths.ENV_DATA] = dataDir
        env[LauncherPaths.ENV_STATIC] = staticDir

        val scope = networkScope.uppercase()
        require(scope == "LOCAL" || scope == "LAN") { "Scope de red no válido: $networkScope" }
        env["ABACOPHY_BIND_MODE"] = scope
        env["ABACOPHY_HOST"] = if (scope == "LAN") "0.0.0.0" else "127.0.0.1"
        env["ABACOPHY_CORS_ALLOWED_ORIGINS"] = corsAllowedOrigins
            .map { it.trim() }
            .filter { it.isNotEmpty() }
            .distinct()
            .joinToString(prefix = "[", postfix = "]") { encodeJsonString(it) }
        onLog("[${ts()}][INFO]   Scope de red=$scope")

        onLog("[${ts()}][INFO] Lanzando ${binary.absolutePath}")
        onLog("[${ts()}][INFO]   PORT=$port")
        onLog("[${ts()}][INFO]   ${LauncherPaths.ENV_DATA}=$dataDir")
        onLog("[${ts()}][INFO]   ${LauncherPaths.ENV_STATIC}=$staticDir")

        val process = try {
            pb.start()
        } catch (e: Exception) {
            throw IllegalStateException(
                "No se pudo arrancar el proceso: ${e.message}. Path: ${binary.absolutePath}",
                e,
            )
        }
        processRef.set(process)

        fun pump(stream: java.io.InputStream, streamName: String) {
            thread(name = "abacophy-$streamName", isDaemon = true) {
                try {
                    BufferedReader(InputStreamReader(stream)).use { reader ->
                        var line: String?
                        while (reader.readLine().also { line = it } != null) {
                            val raw = line ?: continue
                            // stderr de Go ≠ ERROR; solo el texto de la línea decide el nivel
                            val level = classifyGoLogLine(raw)
                            onLog("[${ts()}][$level] $raw")
                        }
                    }
                } catch (_: Exception) {
                    // stream cerrado al matar proceso
                }
            }
        }
        pump(process.inputStream, "out")
        pump(process.errorStream, "err")

        thread(name = "abacophy-wait", isDaemon = true) {
            try {
                val code = process.waitFor()
                exitCodeRef.set(code)
                val level = if (code == 0) "INFO" else "ERROR"
                onLog("[${ts()}][$level] Proceso Go terminó con código $code")
            } catch (e: InterruptedException) {
                Thread.currentThread().interrupt()
            } finally {
                processRef.compareAndSet(process, null)
            }
        }

        // Arranque inmediato fallido (p.ej. no es ejecutable ELF)
        Thread.sleep(80)
        if (!process.isAlive) {
            val code = try {
                process.exitValue()
            } catch (_: Exception) {
                exitCodeRef.get().takeIf { it != Int.MIN_VALUE }
            }
            exitCodeRef.compareAndSet(Int.MIN_VALUE, code ?: -1)
            throw IllegalStateException(
                "El proceso Go terminó al instante (código ${exitCodeRef.get()}). " +
                    "Revisa logs y que el binario sea para este SO.",
            )
        }
    }

    override fun stop() {
        val p = processRef.getAndSet(null) ?: return
        try {
            if (!p.isAlive) {
                try {
                    exitCodeRef.set(p.exitValue())
                } catch (_: Exception) {
                }
                return
            }
            p.destroy()
            val exited = try {
                p.waitFor(3, TimeUnit.SECONDS)
            } catch (_: InterruptedException) {
                Thread.currentThread().interrupt()
                false
            }
            if (!exited || p.isAlive) {
                p.destroyForcibly()
                try {
                    p.waitFor(2, TimeUnit.SECONDS)
                } catch (_: InterruptedException) {
                    Thread.currentThread().interrupt()
                }
            }
            try {
                if (!p.isAlive) exitCodeRef.set(p.exitValue())
            } catch (_: Exception) {
            }
        } catch (_: Exception) {
            try {
                p.destroyForcibly()
            } catch (_: Exception) {
            }
        }
    }

    override fun isAlive(): Boolean {
        val p = processRef.get() ?: return false
        return p.isAlive
    }

    override fun lastExitCode(): Int? {
        val v = exitCodeRef.get()
        return if (v == Int.MIN_VALUE) null else v
    }
}
