package com.elitec.com.feature.identity.data.dto

/** Serialización simple de views/modules para columnas Room (String). */
class JsonViewsModules {
    fun encodeViews(views: List<String>): String =
        views.joinToString(prefix = "[", postfix = "]") { "\"$it\"" }

    fun decodeViews(raw: String): List<String> =
        raw.trim().removePrefix("[").removeSuffix("]")
            .split(',')
            .map { it.trim().trim('"') }
            .filter { it.isNotBlank() }

    fun encodeModules(modules: Map<String, Boolean>): String =
        modules.entries.joinToString(prefix = "{", postfix = "}") { (k, v) -> "\"$k\":$v" }

    fun decodeModules(raw: String): Map<String, Boolean> {
        val body = raw.trim().removePrefix("{").removeSuffix("}")
        if (body.isBlank()) return emptyMap()
        return body.split(',')
            .mapNotNull { pair ->
                val parts = pair.split(':')
                if (parts.size < 2) return@mapNotNull null
                val key = parts[0].trim().trim('"')
                val value = parts[1].trim().toBooleanStrictOrNull() ?: return@mapNotNull null
                key to value
            }
            .toMap()
    }
}
