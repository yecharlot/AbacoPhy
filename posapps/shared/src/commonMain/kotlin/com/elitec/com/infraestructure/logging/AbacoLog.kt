package com.elitec.com.infraestructure.logging

import io.github.aakira.napier.Napier
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Fachada de logging expresiva sobre Napier.
 *
 * Uso típico:
 * ```
 * AbacoLog.step(LogCategory.AUTH, "Splash", "restoreSession start")
 * AbacoLog.apiRequest("POST", "/auth/login", body = """{"username":"..."}""")
 * AbacoLog.apiResponse("POST", "/auth/login", 200, body = "...", elapsedMs = 120)
 * AbacoLog.error(LogCategory.AUTH, "login falló", throwable)
 * ```
 *
 * [breadcrumbTrail] guarda los últimos pasos para diagnosticar “dónde se rompió”.
 */
object AbacoLog {

    private const val MAX_BREADCRUMBS = 40
    private const val MAX_BODY_CHARS = 2_000

    private val mutex = Mutex()
    private val breadcrumbs = ArrayDeque<String>(MAX_BREADCRUMBS)

    // —— niveles genéricos ————————————————————————————————

    fun d(category: LogCategory, message: String, throwable: Throwable? = null) {
        val msg = format(category, "🔍", message)
        if (throwable != null) Napier.d(msg, throwable, category.tag)
        else Napier.d(msg, tag = category.tag)
    }

    fun i(category: LogCategory, message: String) {
        Napier.i(format(category, "ℹ️", message), tag = category.tag)
    }

    fun w(category: LogCategory, message: String, throwable: Throwable? = null) {
        val msg = format(category, "⚠️", message)
        if (throwable != null) Napier.w(msg, throwable, category.tag)
        else Napier.w(msg, tag = category.tag)
    }

    fun e(category: LogCategory, message: String, throwable: Throwable? = null) {
        val msg = format(category, "❌", message)
        pushBreadcrumb(msg)
        if (throwable != null) Napier.e(msg, throwable, category.tag)
        else Napier.e(msg, tag = category.tag)
        dumpBreadcrumbsOnError()
    }

    fun v(category: LogCategory, message: String) {
        Napier.v(format(category, "💬", message), tag = category.tag)
    }

    // —— flujo / pasos (dónde se rompe) ————————————————————

    /**
     * Marca un paso de un flujo (Splash, Login, RegisterSale…).
     * Se acumula en la trail de breadcrumbs.
     */
    fun step(category: LogCategory, flow: String, step: String, detail: String? = null) {
        val body = buildString {
            append("[$flow] → $step")
            if (!detail.isNullOrBlank()) append(" | $detail")
        }
        val msg = format(category, "⚡", body)
        pushBreadcrumb(msg)
        Napier.i(msg, tag = category.tag)
    }

    fun data(category: LogCategory, label: String, payload: Any?) {
        val text = truncate(payload?.toString() ?: "null")
        Napier.d(format(category, "📦", "$label = $text"), tag = category.tag)
    }

    // —— HTTP / API ————————————————————————————————————————

    fun apiRequest(
        method: String,
        url: String,
        headers: Map<String, String> = emptyMap(),
        body: String? = null,
    ) {
        val safeHeaders = headers
            .filterKeys { !it.equals("Authorization", ignoreCase = true) }
            .entries
            .joinToString(", ") { "${it.key}=${it.value}" }
            .ifBlank { "—" }
        val msg = buildString {
            append("REQUEST $method $url")
            append("\n   headers: $safeHeaders")
            if (!body.isNullOrBlank()) {
                append("\n   body: ${truncate(body)}")
            }
        }
        val formatted = format(LogCategory.API, "🚀", msg)
        pushBreadcrumb("🚀 $method $url")
        Napier.i(formatted, tag = LogCategory.API.tag)
    }

    fun apiResponse(
        method: String,
        url: String,
        status: Int,
        body: String? = null,
        elapsedMs: Long? = null,
    ) {
        val ok = status in 200..299
        val icon = if (ok) "✅" else "💥"
        val msg = buildString {
            append("RESPONSE $method $url → HTTP $status")
            if (elapsedMs != null) append(" (${elapsedMs}ms)")
            if (!body.isNullOrBlank()) {
                append("\n   body: ${truncate(body)}")
            }
        }
        val formatted = format(LogCategory.API, icon, msg)
        pushBreadcrumb("$icon $method $url → $status")
        if (ok) Napier.i(formatted, tag = LogCategory.API.tag)
        else Napier.e(formatted, tag = LogCategory.API.tag)
    }

    fun apiException(method: String, url: String, throwable: Throwable, elapsedMs: Long? = null) {
        val timing = elapsedMs?.let { " (${it}ms)" }.orEmpty()
        val msg = "EXCEPTION $method $url$timing: ${throwable.message}"
        val formatted = format(LogCategory.API, "☠️", msg)
        pushBreadcrumb("☠️ $method $url: ${throwable.message}")
        Napier.e(formatted, throwable, LogCategory.API.tag)
        dumpBreadcrumbsOnError()
    }

    // —— breadcrumbs ——————————————————————————————————————

    fun getBreadcrumbs(): List<String> = breadcrumbs.toList()

    fun clearBreadcrumbs() {
        breadcrumbs.clear()
    }

    private fun pushBreadcrumb(entry: String) {
        if (breadcrumbs.size >= MAX_BREADCRUMBS) breadcrumbs.removeFirst()
        breadcrumbs.addLast(entry)
    }

    private fun dumpBreadcrumbsOnError() {
        if (breadcrumbs.isEmpty()) return
        val trail = breadcrumbs.joinToString("\n") { "  • $it" }
        Napier.e(
            format(LogCategory.APP, "🧵", "Breadcrumb trail (últimos pasos):\n$trail"),
            tag = LogCategory.APP.tag,
        )
    }

    private fun format(category: LogCategory, levelIcon: String, message: String): String =
        "${category.icon}$levelIcon ${category.name} | $message"

    private fun truncate(text: String): String =
        if (text.length <= MAX_BODY_CHARS) text
        else text.take(MAX_BODY_CHARS) + "…(+${text.length - MAX_BODY_CHARS} chars)"
}
