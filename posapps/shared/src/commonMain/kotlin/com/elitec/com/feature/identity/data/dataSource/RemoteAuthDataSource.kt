package com.elitec.com.feature.identity.data.dataSource

import com.elitec.com.feature.identity.data.dto.ChangePasswordRequestDto
import com.elitec.com.feature.identity.data.dto.LoginRequestDto
import com.elitec.com.feature.identity.data.dto.LoginResponseDto
import com.elitec.com.feature.identity.data.dto.MeResponseDto
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.bearerAuth
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.http.isSuccess

/** Alineado con web AuthRemoteSource: /auth/login, /auth/me, /auth/logout, /auth/password */
class RemoteAuthDataSource(
    private val http: HttpClient,
    private val baseUrl: String,
) {
    private fun url(path: String) = baseUrl.trimEnd('/') + path

    init {
        require(baseUrl.isNotBlank()) { "apiBaseUrl vacío" }
    }

    suspend fun login(username: String, password: String): LoginResponseDto {
        val response = http.post(url("/auth/login")) {
            contentType(ContentType.Application.Json)
            setBody(LoginRequestDto(username = username, password = password))
        }
        if (!response.status.isSuccess()) {
            error("Usuario o contraseña incorrectos")
        }
        return response.body()
    }

    suspend fun me(token: String): MeResponseDto {
        val response = http.get(url("/auth/me")) {
            bearerAuth(token)
        }
        if (!response.status.isSuccess()) {
            error("Sesión inválida o expirada")
        }
        return response.body()
    }

    suspend fun logout(token: String) {
        runCatching {
            http.post(url("/auth/logout")) {
                bearerAuth(token)
                contentType(ContentType.Application.Json)
                setBody(emptyMap<String, String>())
            }
        }
    }

    suspend fun changePassword(token: String, body: ChangePasswordRequestDto) {
        val response = http.post(url("/auth/password")) {
            bearerAuth(token)
            contentType(ContentType.Application.Json)
            setBody(body)
        }
        if (!response.status.isSuccess()) {
            error("No se pudo cambiar la contraseña")
        }
    }
}
