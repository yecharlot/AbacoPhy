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
 * Lanza `abacophy` vía [ProcessBuilder], reenvía logs y detiene sin zombies.
 * Cada línea se prefija con timestamp HH:mm:ss y el stream de origen.
 */
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

        fun pump(stream: java.io.InputStream, prefix: String) {
            thread(name = "abacophy-$prefix", isDaemon = true) {
                try {
                    BufferedReader(InputStreamReader(stream)).use { reader ->
                        var line: String?
                        while (reader.readLine().also { line = it } != null) {
                            val raw = line ?: continue
                            // Detectar nivel desde el texto del proceso Go
                            val level = when {
                                raw.contains("WARN", ignoreCase = true) ||
                                    raw.contains("WARNING", ignoreCase = true) -> "WARN"
                                raw.contains("ERROR", ignoreCase = true) ||
                                    raw.contains("FATAL", ignoreCase = true) ||
                                    prefix == "err" -> "ERROR"
                                raw.contains("DEBUG", ignoreCase = true) -> "DEBUG"
                                else -> "INFO"
                            }
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
