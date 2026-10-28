package com.elitec.abaco_launcher.feature.orchestrator.domain.repositories

/**
 * Contrato: ciclo de vida del proceso Go (abacophy).
 */
interface BackendProcess {
    /**
     * Arranca el binario en [port] con env PORT / ABACOPHY_DATA / ABACOPHY_STATIC.
     * @param onLog líneas de stdout/stderr del proceso hijo
     */
    fun start(
        port: Int,
        dataDir: String,
        staticDir: String,
        binaryPath: String,
        onLog: (String) -> Unit = {},
    )

    /** Detiene el proceso (destroy → destroyForcibly si no sale a tiempo). */
    fun stop()

    fun isAlive(): Boolean

    /**
     * Código de salida del último proceso terminado, o null si sigue vivo / nunca arrancó.
     */
    fun lastExitCode(): Int?
}
