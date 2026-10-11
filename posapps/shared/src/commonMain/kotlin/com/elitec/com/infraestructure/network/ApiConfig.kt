package com.elitec.com.infraestructure.network

/**
 * URL base del API REST. Siempre termina en `/api/v1`.
 *
 * Entrada → salida:
 * - `http://127.0.0.1:8090` → `http://127.0.0.1:8090/api/v1`
 * - `http://127.0.0.1:8090/api/v1/` → `http://127.0.0.1:8090/api/v1`
 */
class ApiConfig {
    @Volatile
    private var _baseUrl: String = ""

    val baseUrl: String
        get() = _baseUrl

    fun hasBaseUrl(): Boolean = _baseUrl.isNotBlank()

    fun requireBaseUrl(): String {
        var u = _baseUrl
        require(u.isNotBlank()) { "URL del servidor no configurada" }
        val fixed = ensureApiV1(u)
        if (fixed != u) {
            _baseUrl = fixed
        }
        return _baseUrl
    }

    fun update(url: String) {
        _baseUrl = normalizeBaseUrl(url)
    }

    fun clear() {
        _baseUrl = ""
    }

    companion object {
        fun normalizeBaseUrl(raw: String): String = ensureApiV1(raw)

        fun ensureApiV1(raw: String): String {
            var u = raw.trim()
            if (u.isEmpty()) return ""
            while (u.endsWith('/')) u = u.dropLast(1)
            val q = u.indexOf('?')
            if (q >= 0) u = u.substring(0, q)
            val h = u.indexOf('#')
            if (h >= 0) u = u.substring(0, h)
            val lower = u.lowercase()
            return when {
                lower.endsWith("/api/v1") -> u
                lower.endsWith("/api") -> "$u/v1"
                Regex("""/api/v\d+$""").containsMatchIn(lower) -> u
                else -> "$u/api/v1"
            }
        }

        /** true si la URL parece host:puerto sin path de API (causa típica del HTML PWA). */
        fun looksMissingApiPrefix(raw: String): Boolean {
            val u = raw.trim().trimEnd('/').lowercase()
            if (u.isEmpty()) return true
            return !u.contains("/api/")
        }
    }
}
