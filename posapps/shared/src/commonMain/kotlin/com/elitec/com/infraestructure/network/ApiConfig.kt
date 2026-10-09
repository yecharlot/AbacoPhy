package com.elitec.com.infraestructure.network

/**
 * URL base activa en runtime. Mutable sin recrear HttpClient ni Koin.
 * Ejemplo: `http://192.168.1.10:8090/api/v1`
 */
class ApiConfig {
    @Volatile
    private var _baseUrl: String = ""

    val baseUrl: String
        get() = _baseUrl

    fun hasBaseUrl(): Boolean = _baseUrl.isNotBlank()

    fun requireBaseUrl(): String {
        val u = _baseUrl
        require(u.isNotBlank()) { "URL del servidor no configurada" }
        return u
    }

    fun update(url: String) {
        _baseUrl = normalizeBaseUrl(url)
    }

    fun clear() {
        _baseUrl = ""
    }

    companion object {
        fun normalizeBaseUrl(raw: String): String {
            var u = raw.trim()
            while (u.endsWith('/')) {
                u = u.dropLast(1)
            }
            return u
        }
    }
}
