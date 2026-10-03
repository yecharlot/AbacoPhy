package com.elitec.com.infraestructure.logging

import io.ktor.client.HttpClientConfig
import io.ktor.client.plugins.HttpSend
import io.ktor.client.plugins.plugin
import io.ktor.client.request.HttpRequestBuilder
import io.ktor.http.content.OutgoingContent
import io.ktor.client.plugins.logging.LogLevel
import io.ktor.client.plugins.logging.Logging
import kotlin.time.TimeSource

/**
 * Instala:
 * 1. Logging Ktor (headers) → Napier vía [KtorNapierLogger]
 * 2. Interceptor [HttpSend] con request/response/exception + timing
 */
fun HttpClientConfig<*>.installAbacoLogging() {
    install(Logging) {
        logger = KtorNapierLogger()
        level = LogLevel.HEADERS
    }

    install(HttpSend)
}

/**
 * Debe llamarse **después** de crear el [io.ktor.client.HttpClient]:
 * ```
 * val client = HttpClient { ... installAbacoLogging() }
 * client.installAbacoSendInterceptor()
 * ```
 *
 * En Ktor 3, el interceptor de envío se registra así sobre la instancia.
 */
fun io.ktor.client.HttpClient.installAbacoSendInterceptor() {
    plugin(HttpSend).intercept { request ->
        val method = request.method.value
        val url = request.url.buildString()
        val headers = request.headers.entries().associate { it.key to it.value.joinToString(",") }
        val bodyPreview = previewBody(request)

        AbacoLog.apiRequest(method, url, headers, bodyPreview)
        val mark = TimeSource.Monotonic.markNow()

        try {
            val call = execute(request)
            val elapsed = mark.elapsedNow().inWholeMilliseconds
            AbacoLog.apiResponse(
                method = method,
                url = url,
                status = call.response.status.value,
                body = null,
                elapsedMs = elapsed,
            )
            call
        } catch (t: Throwable) {
            AbacoLog.apiException(
                method = method,
                url = url,
                throwable = t,
                elapsedMs = mark.elapsedNow().inWholeMilliseconds,
            )
            throw t
        }
    }
}

private fun previewBody(request: HttpRequestBuilder): String? {
    return when (val body = request.body) {
        is OutgoingContent.ByteArrayContent ->
            runCatching { body.bytes().decodeToString() }.getOrNull()
        is String -> body
        else -> body?.toString()?.takeIf { it.isNotBlank() && !it.contains("EmptyContent") }
    }
}
