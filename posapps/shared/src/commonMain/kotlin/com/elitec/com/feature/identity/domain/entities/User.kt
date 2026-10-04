package com.elitec.com.feature.identity.domain.entities

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonPrimitive

data class User(
    val id: String,
    val username: String,
    val displayName: String,
    val role: String,
    val tenantId: String,
    val metadata: String? = null,
) {
    /**
     * Misma convención que webapp App.svelte:
     * metadata JSON → { "unitIds": ["..."] }
     */
    fun assignedUnitIds(): List<String> {
        val raw = metadata?.trim().orEmpty()
        if (raw.isEmpty()) return emptyList()
        return runCatching {
            val element = MetaJson.parseToJsonElement(raw)
            val obj = element as? JsonObject ?: return emptyList()
            val arr = obj["unitIds"] as? JsonArray ?: return emptyList()
            arr.mapNotNull { el ->
                when (el) {
                    is JsonPrimitive -> el.contentOrNull?.takeIf { it.isNotBlank() }
                    else -> null
                }
            }
        }.getOrDefault(emptyList())
    }

    private companion object {
        val MetaJson = Json { ignoreUnknownKeys = true; isLenient = true }
    }
}
