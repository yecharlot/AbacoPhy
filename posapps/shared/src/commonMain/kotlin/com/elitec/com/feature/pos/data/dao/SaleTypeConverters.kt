package com.elitec.com.feature.pos.data.dao

import androidx.room3.TypeConverter
import com.elitec.com.feature.pos.data.dto.SaleLineDto
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class SaleTypeConverters {
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    @TypeConverter
    fun linesToString(value: List<SaleLineDto>?): String =
        json.encodeToString(value.orEmpty())

    @TypeConverter
    fun stringToLines(value: String?): List<SaleLineDto> =
        if (value.isNullOrBlank()) emptyList()
        else runCatching { json.decodeFromString<List<SaleLineDto>>(value) }.getOrDefault(emptyList())
}
