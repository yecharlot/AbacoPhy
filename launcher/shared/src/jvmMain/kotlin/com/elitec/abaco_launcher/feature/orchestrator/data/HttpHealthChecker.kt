package com.elitec.abaco_launcher.feature.orchestrator.data

import com.elitec.abaco_launcher.feature.orchestrator.domain.repositories.BackendHealth
import kotlinx.coroutines.delay
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Duration

/**
 * Poll GET /api/v1/health (fallback /api/v1/info) hasta timeout o muerte del proceso.
 */
class HttpHealthChecker(
    private val pollIntervalMs: Long = 400L,
) : BackendHealth {
    private val client: HttpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(2))
        .build()

    override suspend fun waitUntilReady(
        baseUrl: String,
        timeoutMs: Long,
        isProcessAlive: () -> Boolean,
    ): Boolean {
        val base = baseUrl.trimEnd('/')
        val paths = listOf("/api/v1/health", "/api/v1/info")
        val deadline = System.currentTimeMillis() + timeoutMs

        while (System.currentTimeMillis() < deadline) {
            if (!isProcessAlive()) return false
            for (path in paths) {
                if (probe("$base$path")) return true
            }
            delay(pollIntervalMs)
        }
        return false
    }

    private fun probe(url: String): Boolean {
        return try {
            val request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(2))
                .GET()
                .build()
            val response = client.send(request, HttpResponse.BodyHandlers.discarding())
            response.statusCode() in 200..299
        } catch (_: Exception) {
            false
        }
    }
}
