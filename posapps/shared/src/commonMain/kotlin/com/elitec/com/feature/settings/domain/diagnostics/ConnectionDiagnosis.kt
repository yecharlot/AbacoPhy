package com.elitec.com.feature.settings.domain.diagnostics

/**
 * Resultado de diagnósticos locales (solo Desktop aplica comprobaciones reales).
 * No toca backend de negocio: solo HTTP health a candidatos locales.
 */
enum class DiagnosisKind {
    /** Android u otras plataformas: sin diagnóstico de firewall LAN. */
    NotApplicable,
    /** Ni loopback ni LAN responden: proceso apagado, puerto mal o binario no levantado. */
    BackendLikelyDown,
    /** 127.0.0.1 OK: usar URL local en este mismo PC. */
    LoopbackOkUseLocalhost,
    /** Loopback OK y LAN no: patrón típico de firewall de entrada. */
    LikelyFirewall,
    /** Nada en loopback; discovery vacío — posible VPN/multicast o servidor en otra máquina. */
    LikelyVpnOrNetwork,
    Unknown,
}

data class ConnectionDiagnosis(
    val kind: DiagnosisKind = DiagnosisKind.NotApplicable,
    val title: String = "",
    val detail: String = "",
    val steps: List<String> = emptyList(),
    /** URL lista para pegar en el campo (…/api/v1) si loopback respondió. */
    val suggestedBaseUrl: String? = null,
    val loopbackHealthOk: Boolean = false,
    val lanHealthOk: Boolean = false,
    val portsTried: List<Int> = emptyList(),
)
