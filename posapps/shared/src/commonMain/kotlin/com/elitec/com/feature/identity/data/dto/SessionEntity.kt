package com.elitec.com.feature.identity.data.dto

import androidx.room3.Entity
import androidx.room3.PrimaryKey
import com.elitec.com.feature.identity.domain.entities.Session
import com.elitec.com.feature.identity.domain.entities.User

@Entity(tableName = "session_active")
data class SessionEntity(
    @PrimaryKey val id: Int = 1,
    val token: String = "",
    val expiresAt: String? = null,
    val userId: String = "",
    val username: String = "",
    val displayName: String = "",
    val role: String = "",
    val tenantId: String = "",
    val userMetadata: String? = null,
    val viewsJson: String = "[]",
    val modulesJson: String = "{}",
    val tenantName: String? = null,
    val rev: Double? = null,
    val rootCid: String? = null,
    val metadata: String? = null,
)

fun SessionEntity.toDomain(json: JsonViewsModules): Session = Session(
    token = token,
    expiresAt = expiresAt,
    user = User(
        id = userId,
        username = username,
        displayName = displayName,
        role = role,
        tenantId = tenantId,
        metadata = userMetadata,
    ),
    views = json.decodeViews(viewsJson),
    modules = json.decodeModules(modulesJson),
    tenantName = tenantName,
    rev = rev,
    rootCid = rootCid,
    metadata = metadata,
)

fun Session.toEntity(json: JsonViewsModules): SessionEntity = SessionEntity(
    id = 1,
    token = token,
    expiresAt = expiresAt,
    userId = user.id,
    username = user.username,
    displayName = user.displayName,
    role = user.role,
    tenantId = user.tenantId,
    userMetadata = user.metadata,
    viewsJson = json.encodeViews(views),
    modulesJson = json.encodeModules(modules),
    tenantName = tenantName,
    rev = rev,
    rootCid = rootCid,
    metadata = metadata,
)
