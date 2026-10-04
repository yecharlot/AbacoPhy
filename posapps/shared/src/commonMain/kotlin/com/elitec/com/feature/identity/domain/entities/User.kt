package com.elitec.com.feature.identity.domain.entities

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import com.elitec.com.infraestructure.logging.AbacoLog
import com.elitec.com.infraestructure.logging.LogCategory

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
            val obj = element as? JsonObject
            if (obj == null) {
                AbacoLog.w(LogCategory.AUTH, "User.metadata no es un objeto JSON: $raw")
                return@runCatching emptyList()
            }
            val arr = (obj["unitIds"] ?: obj["unit_ids"]) as? JsonArray
            if (arr == null) {
                AbacoLog.w(
                    LogCategory.AUTH,
                    "User.metadata recibido pero no contiene unitIds/unit_ids: $raw",
                )
                return@runCatching emptyList()
            }
            arr.mapNotNull { el ->
                when (el) {
                    is JsonPrimitive -> el.contentOrNull?.takeIf { it.isNotBlank() }
                    else -> null
                }
            }.also { ids ->
                AbacoLog.data(LogCategory.AUTH, "User.assignedUnitIds", ids)
            }
        }.onFailure { e ->
            AbacoLog.e(
                LogCategory.AUTH,
                "No se pudo parsear User.metadata como JSON: $raw",
                e,
            )
        }.getOrDefault(emptyList())
    }


    fun withAssignedUnitIds(unitIds: List<String>): User {
        val base = runCatching {
            metadata?.takeIf { it.isNotBlank() }?.let {
                MetaJson.parseToJsonElement(it) as? JsonObject
            }
        }.getOrNull()
        val merged = buildJsonObject {
            base?.forEach { (key, value) ->
                if (key != "unitIds" && key != "unit_ids") put(key, value)
            }
            put("unitIds", buildJsonArray {
                unitIds.distinct().forEach { add(it) }
            })
        }
        return copy(metadata = MetaJson.encodeToString(JsonObject.serializer(), merged))
    }

    private companion object {
        val MetaJson = Json { ignoreUnknownKeys = true; isLenient = true }
    }
}
