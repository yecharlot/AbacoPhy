package com.elitec.com.feature.identity.data.dto

import kotlinx.serialization.Serializable

@Serializable
data class TenantReferenceDto(
    val id: String?,
    val name: String?
)