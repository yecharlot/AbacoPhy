package com.elitec.abaco_launcher.feature.orchestrator.di

import com.elitec.abaco_launcher.feature.orchestrator.data.DesktopBrowserLauncher
import com.elitec.abaco_launcher.feature.orchestrator.data.GoProcessLauncher
import com.elitec.abaco_launcher.feature.orchestrator.data.HttpHealthChecker
import com.elitec.abaco_launcher.feature.orchestrator.data.SystemPortResolver
import com.elitec.abaco_launcher.feature.orchestrator.domain.usecases.OrchestratorUseCase
import com.elitec.abaco_launcher.infrastructure.config.LauncherPaths

/**
 * Wiring manual JVM: data → domain use case.
 */
object OrchestratorModule {
    fun provideUseCase(
        healthTimeoutMs: Long = 60_000L,
    ): OrchestratorUseCase {
        return OrchestratorUseCase(
            portResolver = SystemPortResolver(),
            backendProcess = GoProcessLauncher(),
            backendHealth = HttpHealthChecker(),
            browserLauncher = DesktopBrowserLauncher(),
            binaryPath = { LauncherPaths.resolveBinary().absolutePath },
            dataDir = {
                val dir = LauncherPaths.resolveDataDir()
                dir.mkdirs()
                dir.absolutePath
            },
            staticDir = {
                val dir = LauncherPaths.resolveStaticDir()
                dir.mkdirs()
                dir.absolutePath
            },
            healthTimeoutMs = healthTimeoutMs,

        )
    }
}
