package com.elitec.com.feature.settings.domain

import com.elitec.com.infraestructure.network.ApiConfig
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import io.ktor.http.isSuccess

/**
 * Prueba conectividad contra `{baseUrl}/info` (o `/health`) sin autenticación.
 * No persiste ni muta [ApiConfig] salvo que el llamador lo haga tras éxito.
 */
class ProbeApiConnection(
    private val http: HttpClient,
) {
    suspend fun execute(rawUrl: String): Result<String> {
        val base = ApiConfig.normalizeBaseUrl(rawUrl)
        if (base.isBlank()) {
            return Result.failure(IllegalArgumentException("Indique la URL del servidor"))
        }
        if (!base.startsWith("http://") && !base.startsWith("https://")) {
            return Result.failure(IllegalArgumentException("La URL debe empezar por http:// o https://"))
        }
        return try {
            val info = http.get("$base/info")
            if (info.status.isSuccess()) {
                return Result.success(base)
            }
            val health = http.get("$base/health")
            if (health.status.isSuccess()) {
                Result.success(base)
            } else {
                Result.failure(
                    IllegalStateException(
                        "Servidor respondió HTTP ${info.status.value}. Compruebe la URL (debe incluir /api/v1).",
                    ),
                )
            }
        } catch (e: Exception) {
            Result.failure(
                IllegalStateException(
                    e.message?.takeIf { it.isNotBlank() } ?: "No se pudo conectar con el servidor",
                    e,
                ),
            )
        }
    }
}
