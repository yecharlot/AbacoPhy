package com.elitec.com.feature.settings.domain

import com.elitec.com.infraestructure.network.ApiConfig
import io.github.aakira.napier.Napier
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import io.ktor.client.statement.bodyAsText
import io.ktor.http.isSuccess
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.contentOrNull

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

    /**
     * Valida el contrato público de discovery. Los TXT mDNS son solo pistas;
     * /api/v1/info es la fuente de verdad para identidad y compatibilidad.
     */
    suspend fun validateDiscovered(rawUrl: String): Result<String> {
        val base = ApiConfig.normalizeBaseUrl(rawUrl)
        Napier.i("HTTP_PROBE_START url=$base/info", tag = "AbacoPhy-Probe")
        return try {
            val response = http.get("$base/info")
            val contentType = response.headers["Content-Type"].orEmpty().lowercase()
            Napier.i("HTTP_PROBE_RESPONSE url=$base/info status=${response.status.value} contentType=$contentType", tag = "AbacoPhy-Probe")
            if (!response.status.isSuccess() || !contentType.contains("json")) {
                Napier.w("HTTP_PROBE_REJECTED reason=invalid_status_or_content_type status=${response.status.value} contentType=$contentType", tag = "AbacoPhy-Probe")
                return Result.failure(IllegalStateException("El servidor descubierto no ofrece /api/v1/info en JSON"))
            }
            val payload = Json.parseToJsonElement(response.bodyAsText()).jsonObject
            val product = payload["product"]?.jsonPrimitive?.contentOrNull
            val instanceId = payload["instanceId"]?.jsonPrimitive?.contentOrNull
            val apiVersion = payload["apiVersion"]?.jsonPrimitive?.intOrNull
            if (!product.equals("AbacoPhy", ignoreCase = true) || instanceId.isNullOrBlank()) {
                Napier.w("HTTP_PROBE_REJECTED reason=identity_mismatch product=$product instanceIdPresent=${!instanceId.isNullOrBlank()}", tag = "AbacoPhy-Probe")
                return Result.failure(IllegalStateException("El servidor no se identifica como una instancia AbacoPhy válida"))
            }
            if (apiVersion != 1) {
                Napier.w("HTTP_PROBE_REJECTED reason=api_version expected=1 actual=$apiVersion", tag = "AbacoPhy-Probe")
                return Result.failure(IllegalStateException("Versión de API incompatible: " + (apiVersion?.toString() ?: "desconocida") + "; esta APK requiere API 1"))
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
        if (base.isBlank()) {
            return Result.failure(IllegalStateException("No hay URL de servidor configurada"))
        }
        return execute(base)
    }
}
