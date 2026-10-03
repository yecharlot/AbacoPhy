package com.elitec.com.feature.identity.domain.entities

data class User(
    val id: String,
    val username: String,
    val displayName: String,
    val role: String,
    val tenantId: String,
    val metadata: String? = null,
) {
    /** unitIds del trabajador en metadata (misma convención que web/empleados). */
    fun assignedUnitIds(): List<String> {
        val raw = metadata ?: return emptyList()
        return runCatching {
            // metadata como JSON {"unitIds":["..."]}
            val marker = "\"unitIds\""
            val idx = raw.indexOf(marker)
            if (idx < 0) return emptyList()
            val start = raw.indexOf('[', idx)
            val end = raw.indexOf(']', start)
            if (start < 0 || end < 0) return emptyList()
            raw.substring(start + 1, end)
                .split(',')
                .map { it.trim().trim('"') }
                .filter { it.isNotBlank() }
        }.getOrDefault(emptyList())
    }
}
