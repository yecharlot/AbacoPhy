package com.elitec.com.infraestructure.network

/**
 * Puente sin Koin para el interceptor HTTP y los data sources.
 * [ServerConnectivityGuard] se registra al arrancar settingsModule.
 */
object ServerConnectivityBridge {
    @Volatile
    private var guard: ServerConnectivityGuard? = null

    fun bind(g: ServerConnectivityGuard) {
        guard = g
    }

    fun onTransportFailure(requestUrl: String, cause: Throwable) {
        guard?.onTransportFailure(requestUrl, cause)
    }

    /** Respuesta 200 con HTML/PWA u otra señal de URL mal formada. */
    fun onApiMisconfiguration(requestUrl: String, reason: String) {
        guard?.onApiMisconfiguration(requestUrl, reason)
    }
}
