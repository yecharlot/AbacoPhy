package com.elitec.abaco_launcher.feature.orchestrator.domain.usecases

import com.elitec.abaco_launcher.feature.orchestrator.domain.models.OrchestratorState
import com.elitec.abaco_launcher.feature.orchestrator.domain.models.TaskStep
import com.elitec.abaco_launcher.feature.orchestrator.domain.models.TaskStepStatus
import com.elitec.abaco_launcher.feature.orchestrator.domain.repositories.BackendHealth
import com.elitec.abaco_launcher.feature.orchestrator.domain.repositories.BackendProcess
import com.elitec.abaco_launcher.feature.orchestrator.domain.repositories.BrowserLauncher
import com.elitec.abaco_launcher.feature.orchestrator.domain.repositories.PortResolver

/**
 * Secuencia: puerto libre → proceso Go → health → navegador.
 * El puerto reutiliza la última asignación operativa cuando está disponible.
 */
class OrchestratorUseCase(
    private val portResolver: PortResolver,
    private val backendProcess: BackendProcess,
    private val backendHealth: BackendHealth,
    private val browserLauncher: BrowserLauncher,
    private val binaryPath: () -> String,
    private val dataDir: () -> String,
    private val staticDir: () -> String,
    private val healthTimeoutMs: Long = 60_000L,
    private val lanIpResolver: () -> List<String> = { emptyList() },
) {
    private val stepDefs = listOf(
        "port" to "Resolver puerto libre",
        "backend" to "Lanzar backend Go",
        "health" to "Esperar health del API",
        "discovery" to "Anunciar servidor en la red (mDNS)",
        "browser" to "Abrir navegador",
    )

    suspend fun run(
        preferredPort: Int? = null,
        onState: (OrchestratorState) -> Unit = {},
        onLog: (String) -> Unit = {},
    ): OrchestratorState {
        var steps = stepDefs.map { (id, label) -> TaskStep(id, label) }
        var port: Int? = null
        var baseUrl: String? = null
        var lanUrls: List<String> = emptyList()

        fun emit(
            backendRunning: Boolean = backendProcess.isAlive(),
            error: String? = null,
        ): OrchestratorState {
            val state = OrchestratorState(
                steps = steps,
                port = port,
                baseUrl = baseUrl,
                backendRunning = backendRunning,
                lastError = error,
                lanUrls = lanUrls,
            )
            onState(state)
            return state
        }

        fun updateStep(id: String, status: TaskStepStatus, detail: String? = null) {
            steps = steps.map {
                if (it.id == id) it.copy(status = status, detail = detail) else it
            }
        }

        try {
            // 1. Puerto
            updateStep("port", TaskStepStatus.Running)
            emit()
            onLog(
                if (preferredPort != null) "Usando puerto configurado: $preferredPort…"
                else "Intentando reutilizar el último puerto operativo…",
            )
            port = try {
                portResolver.resolvePort(preferredPort)
            } catch (e: Exception) {
                throw IllegalStateException(
                    e.message ?: "No se pudo obtener puerto: ${e.message}",
                    e,
                )
            }
            if (port !in 1..65535) {
                throw IllegalStateException("Puerto inválido: $port")
            }
            updateStep(
                "port",
                TaskStepStatus.Success,
                if (preferredPort != null) "Puerto: $port (configurado)" else "Puerto: $port (reutilizado o nuevo)",
            )
            emit()
            onLog("✅ Puerto resuelto: $port")

            // 2. Backend
            updateStep("backend", TaskStepStatus.Running)
            emit()
            val bin = binaryPath()
            val data = dataDir()
            val staticPath = staticDir()
            onLog("Binario esperado: $bin")
            backendProcess.start(
                port = port!!,
                dataDir = data,
                staticDir = staticPath,
                binaryPath = bin,
                onLog = onLog,
            )
            if (!backendProcess.isAlive()) {
                val code = backendProcess.lastExitCode()
                throw IllegalStateException(
                    "El proceso Go no quedó en ejecución" +
                        (code?.let { " (exit $it)" } ?: ""),
                )
            }
            updateStep("backend", TaskStepStatus.Success, "Proceso activo")
            emit(backendRunning = true)
            onLog("✅ Backend lanzado")

            // 3. Health
            updateStep("health", TaskStepStatus.Running)
            emit(backendRunning = true)
            baseUrl = "http://127.0.0.1:$port"
            onLog("Esperando health en $baseUrl … (timeout ${healthTimeoutMs}ms)")
            val ready = backendHealth.waitUntilReady(
                baseUrl = baseUrl!!,
                timeoutMs = healthTimeoutMs,
                isProcessAlive = { backendProcess.isAlive() },
            )
            if (!ready) {
                if (!backendProcess.isAlive()) {
                    val code = backendProcess.lastExitCode()
                    throw IllegalStateException(
                        "El backend se detuvo antes de responder health" +
                            (code?.let { " (exit $it)" } ?: "") +
                            ". Revisa la consola (puerto en uso, static/data inválidos).",
                    )
                }
                throw IllegalStateException(
                    "Timeout (${healthTimeoutMs}ms): sin respuesta en $baseUrl/api/v1/health. " +
                        "Se detendrá el proceso hijo.",
                )
            }

            // Solo después de health OK consideramos el puerto como último puerto válido.
            portResolver.rememberPort(port!!)
            updateStep("health", TaskStepStatus.Success, "API listo")
            updateStep("discovery", TaskStepStatus.Running, "Esperando confirmación del anuncio mDNS")
            val ips = lanIpResolver()
            lanUrls = ips.map { "http://$it:$port" }
            emit(backendRunning = true)
            onLog("✅ Health OK · puerto $port guardado para el próximo arranque")
            onLog("🌐 URL Local:      $baseUrl/")
            onLog("🔎 Discovery esperado: _abacophy._tcp.local; esperando confirmación del backend")
            if (lanUrls.isNotEmpty()) {
                lanUrls.forEach { u ->
                    onLog("🌐 URL Red (LAN):  $u/")
                }
            }
            onLog("— Credenciales bootstrap (datos nuevos) —")
            onLog("  master / AbacoPhy#Master1")
            onLog("  admin  / admin123")
            onLog("Si no entras: borra ABACOPHY_DATA o usa esos usuarios en un data dir limpio.")

            // 4. Browser
            updateStep("browser", TaskStepStatus.Running)
            emit(backendRunning = true)
            val url = "$baseUrl/"
            onLog("Abriendo $url")
            try {
                browserLauncher.open(url)
            } catch (e: Exception) {
                onLog("WARN: no se pudo abrir el navegador: ${e.message}")
                updateStep(
                    "browser",
                    TaskStepStatus.Success,
                    "URL: $url (abre manualmente si el navegador falló)",
                )
                return emit(backendRunning = true)
            }
            updateStep("browser", TaskStepStatus.Success, url)
            return emit(backendRunning = true)
        } catch (e: Exception) {
            val msg = e.message ?: e.toString()
            onLog("ERROR: $msg")
            steps = steps.map { step ->
                when {
                    step.status == TaskStepStatus.Running ->
                        step.copy(status = TaskStepStatus.Failed, detail = msg)
                    else -> step
                }
            }
            try {
                backendProcess.stop()
            } catch (_: Exception) {
            }
            return emit(backendRunning = false, error = msg)
        }
    }

    fun stopBackend() {
        backendProcess.stop()
    }

    fun isBackendAlive(): Boolean = backendProcess.isAlive()

    /** Expuesto para shutdown hook / single-instance. */
    fun backendProcess(): BackendProcess = backendProcess
}
