package com.elitec.com.feature.identity.data.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class MeResponseDto(
    val user: UserDto,
    val tenant: TenantReferenceDto,
    val rev: Double,
    @SerialName("root_cid")
    val rootCid: String,
    val views: List<String>,
    val modules: Map<String, Boolean>,
/** JSON string opaco; ausente si el API no lo envía. */
    val metadata: String?
)
