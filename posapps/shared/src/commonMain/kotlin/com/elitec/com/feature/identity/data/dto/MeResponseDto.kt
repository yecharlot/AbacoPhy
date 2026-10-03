package com.elitec.com.feature.identity.data.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class TenantRefDto(
    val name: String? = null,
)

@Serializable
data class MeResponseDto(
    val user: UserDto? = null,
    val views: List<String>? = null,
    val modules: Map<String, Boolean>? = null,
    val tenant: TenantRefDto? = null,
    val rev: Double? = null,
    @SerialName("root_cid") val rootCid: String? = null,
)
