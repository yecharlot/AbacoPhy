package com.elitec.com.feature.settings.domain

import com.elitec.com.infraestructure.network.ApiConfig
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import io.ktor.client.statement.bodyAsText
import io.ktor.http.isSuccess

/**
 * Prueba `{base}/info` y `{base}/health`.
 * Solo tiene éxito si responde la API (JSON), no el HTML de la PWA.
 * **Nunca persiste** la URL: el llamador guarda solo tras [Result.success].
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
            return Result.failure(
                IllegalArgumentException("La URL debe empezar por http:// o https://"),
            )
        }
        return try {
            val info = http.get("$base/info")
            val ct = info.headers["Content-Type"].orEmpty().lowercase()
            if (info.status.isSuccess() && ct.contains("json")) {
                return Result.success(base)
            }
            // Fallback health
            val health = http.get("$base/health")
            val ctH = health.headers["Content-Type"].orEmpty().lowercase()
            if (health.status.isSuccess() && !ctH.contains("text/html")) {
                return Result.success(base)
            }
            // Diagnóstico claro
            val bodyStart = runCatching { info.bodyAsText().trimStart().take(80) }.getOrDefault("")
            if (ct.contains("text/html") || bodyStart.startsWith("<")) {
                return Result.failure(
                    IllegalStateException(
                        "El servidor devolvió HTML (app web), no la API REST. " +
                            "Use una URL con /api/v1, por ejemplo: http://127.0.0.1:8090/api/v1 " +
                            "(normalizada: $base).",
                    ),
                )
            }
            Result.failure(
                IllegalStateException(
                    "No hay respuesta válida de /info ni /health (HTTP ${info.status.value}, " +
                        "Content-Type: $ct). Compruebe que el backend ÁbacoPhy está en marcha " +
                        "y que la URL es correcta.",
                ),
            )
        } catch (e: Exception) {
            Result.failure(
                IllegalStateException(
                    buildString {
                        append(e.message?.takeIf { it.isNotBlank() } ?: "No se pudo conectar")
                        append(". Verifique red, puerto y que el servidor esté activo.")
                    },
                    e,
                ),
            )
        }
    }

    suspend fun probeConfigured(apiConfig: ApiConfig): Result<String> {
        val base = apiConfig.baseUrl
        if (base.isBlank()) {
            return Result.failure(IllegalStateException("No hay URL de servidor configurada"))
        }
        return execute(base)
    }
}
