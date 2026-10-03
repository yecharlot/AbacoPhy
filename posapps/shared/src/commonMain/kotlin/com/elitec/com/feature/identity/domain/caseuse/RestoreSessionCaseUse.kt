package com.elitec.com.feature.identity.domain.caseuse

/**
 * @deprecated Prefer [BootstrapSessionCaseUse]. Conservado por compatibilidad DI.
 */
class RestoreSessionCaseUse(
    private val bootstrap: BootstrapSessionCaseUse,
) {
    suspend operator fun invoke() = runCatching {
        bootstrap(minDisplayMs = 0)
        null
    }
}
