package com.elitec.com.feature.settings.domain

import com.elitec.com.infraestructure.network.ApiConfig
import io.github.aakira.napier.Napier
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import io.ktor.client.statement.bodyAsText
import io.ktor.http.isSuccess
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/**
 * Comprueba que una URL corresponde al backend REST de AbacoPhy.
 * La URL nunca se persiste desde esta clase; el llamador decide cuándo guardarla.
 */
class ProbeApiConnection(
    private val http: HttpClient,
) {
    /** Arranque completo: health primero y después identidad/API. */
    suspend fun execute(rawUrl: String): Result<String> {
        val base = normalize(rawUrl).getOrElse { return Result.failure(it) }
        checkHealth(base).getOrElse { return Result.failure(it) }
        return validateDiscovered(base)
    }

    /** Comprueba exclusivamente que el backend responde en /health. */
    suspend fun checkHealth(rawUrl: String): Result<String> {
        val base = normalize(rawUrl).getOrElse { return Result.failure(it) }
        Napier.i("HEALTH_PROBE_START url=$base/health", tag = "AbacoPhy-Probe")
        return try {
            val response = http.get("$base/health")
            val contentType = response.headers["Content-Type"].orEmpty().lowercase()
            Napier.i(
                "HEALTH_PROBE_RESPONSE url=$base/health status=${response.status.value} contentType=$contentType",
                tag = "AbacoPhy-Probe",
            )
            if (response.status.isSuccess() && !contentType.contains("text/html")) {
                Napier.i("HEALTH_PROBE_OK url=$base/health", tag = "AbacoPhy-Probe")
                Result.success(base)
            } else {
                Result.failure(IllegalStateException("Health no disponible (HTTP ${response.status.value}, Content-Type: $contentType)"))
            }
        } catch (e: Exception) {
            Napier.e("HEALTH_PROBE_EXCEPTION url=$base/health message=${e.message}", e, tag = "AbacoPhy-Probe")
            Result.failure(IllegalStateException(e.message?.takeIf { it.isNotBlank() } ?: "No se pudo comprobar el health del servidor", e))
        }
    }

    /** Valida health + identidad + versión de API, sin reintentos. */
    suspend fun validateServerReady(rawUrl: String): Result<String> {
        val base = normalize(rawUrl).getOrElse { return Result.failure(it) }
        checkHealth(base).getOrElse { return Result.failure(it) }
        return validateDiscovered(base)
    }

    /**
     * Valida el contrato público de discovery. Los TXT mDNS son solo pistas;
     * /health y /info son la fuente de verdad para disponibilidad e identidad.
     */
    suspend fun validateDiscovered(rawUrl: String): Result<String> {
        val base = normalize(rawUrl).getOrElse { return Result.failure(it) }
        Napier.i("HTTP_PROBE_START url=$base/info", tag = "AbacoPhy-Probe")
        return try {
            val response = http.get("$base/info")
            val contentType = response.headers["Content-Type"].orEmpty().lowercase()
            Napier.i(
                "HTTP_PROBE_RESPONSE url=$base/info status=${response.status.value} contentType=$contentType",
                tag = "AbacoPhy-Probe",
            )
            if (!response.status.isSuccess() || !contentType.contains("json")) {
                Napier.w("HTTP_PROBE_REJECTED reason=invalid_status_or_content_type status=${response.status.value} contentType=$contentType", tag = "AbacoPhy-Probe")
                return Result.failure(IllegalStateException("El servidor descubierto no ofrece /api/v1/info en JSON"))
            }
            val payload = Json.parseToJsonElement(response.bodyAsText()).jsonObject
            val product = payload["product"]?.jsonPrimitive?.contentOrNull
            val instanceId = payload["instanceId"]?.jsonPrimitive?.contentOrNull
            val apiVersion = payload["apiVersion"]?.jsonPrimitive?.intOrNull
            if (!product.equals("AbacoPhy", ignoreCase = true) || instanceId.isNullOrBlank()) {
                return Result.failure(IllegalStateException("El servidor no se identifica como una instancia AbacoPhy válida"))
            }
            if (apiVersion != 1) {
                return Result.failure(IllegalStateException("Versión de API incompatible: ${apiVersion?.toString() ?: "desconocida"}; esta APK requiere API 1"))
            }
            Napier.i("HTTP_PROBE_OK url=$base apiVersion=$apiVersion instanceIdPresent=true", tag = "AbacoPhy-Probe")
            Result.success(base)
        } catch (e: Exception) {
            Napier.e("HTTP_PROBE_EXCEPTION url=$base/info message=${e.message}", e, tag = "AbacoPhy-Probe")
            Result.failure(IllegalStateException(e.message ?: "No se pudo validar el servidor descubierto", e))
        }
    }

    suspend fun probeConfigured(apiConfig: ApiConfig): Result<String> {
        val base = apiConfig.baseUrl
        if (base.isBlank()) return Result.failure(IllegalStateException("No hay URL de servidor configurada"))
        return execute(base)
    }

    private fun normalize(rawUrl: String): Result<String> {
        val base = ApiConfig.normalizeBaseUrl(rawUrl)
        if (base.isBlank()) return Result.failure(IllegalArgumentException("Indique la URL del servidor"))
        if (!base.startsWith("http://") && !base.startsWith("https://")) {
            return Result.failure(IllegalArgumentException("La URL debe empezar por http:// o https://"))
        }
        return Result.success(base)
    }
}
