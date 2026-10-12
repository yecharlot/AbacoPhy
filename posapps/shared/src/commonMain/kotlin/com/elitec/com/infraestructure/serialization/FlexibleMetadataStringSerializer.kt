package com.elitec.com.infraestructure.serialization

import kotlinx.serialization.KSerializer
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.descriptors.buildClassSerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonDecoder
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonEncoder
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull

object FlexibleMetadataStringSerializer : KSerializer<String?> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("FlexibleMetadataString")

    override fun deserialize(decoder: Decoder): String? {
        val jsonDecoder = decoder as? JsonDecoder
            ?: return runCatching { decoder.decodeString() }.getOrNull()
        return when (val element = jsonDecoder.decodeJsonElement()) {
            is JsonNull -> null
            is JsonPrimitive -> {
                val raw = element.contentOrNull ?: return null
                val t = raw.trim()
                if (t.isEmpty() || t == "null") null else raw
            }
            is JsonObject, is JsonArray -> element.toString()
            else -> element.toString()
        }
    }

    override fun serialize(encoder: Encoder, value: String?) {
        val jsonEncoder = encoder as? JsonEncoder
        if (jsonEncoder == null) {
            if (value == null) encoder.encodeNull() else encoder.encodeString(value)
            return
        }
        if (value == null) {
            jsonEncoder.encodeJsonElement(JsonNull)
            return
        }
        val trimmed = value.trim()
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
            val element: JsonElement = runCatching {
                Json.parseToJsonElement(trimmed)
            }.getOrElse { JsonPrimitive(value) }
            jsonEncoder.encodeJsonElement(element)
        } else {
            jsonEncoder.encodeJsonElement(JsonPrimitive(value))
        }
    }
}
