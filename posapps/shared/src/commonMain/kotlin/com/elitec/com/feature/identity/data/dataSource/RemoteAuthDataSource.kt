package com.elitec.com.feature.identity.data.dataSource

import com.elitec.com.feature.identity.data.dto.ChangePasswordRequestDto
import com.elitec.com.feature.identity.data.dto.LoginRequestDto
import com.elitec.com.feature.identity.data.dto.LoginResponseDto
import com.elitec.com.feature.identity.data.dto.MeResponseDto
import com.elitec.com.infraestructure.logging.AbacoLog
import com.elitec.com.infraestructure.logging.LogCategory
import com.elitec.com.infraestructure.network.ApiConfig
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.bearerAuth
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.http.isSuccess
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonPrimitive

/** Alineado con web AuthRemoteSource: /auth/login, /auth/me, /auth/logout, /auth/password */
class RemoteAuthDataSource(
    private val http: HttpClient,
    private val apiConfig: ApiConfig,
) {
    private fun url(path: String) = apiConfig.requireBaseUrl().trimEnd('/') + path

    suspend fun login(username: String, password: String): LoginResponseDto {
        val response = http.post(url("/auth/login")) {
            contentType(ContentType.Application.Json)
            setBody(LoginRequestDto(username = username, password = password))
        }
        if (!response.status.isSuccess()) {
            AbacoLog.apiResponse("POST", url("/auth/login"), response.status.value, "login failed")
            error("Usuario o contraseña incorrectos")
        }
        val dto = response.body<LoginResponseDto>()
        AbacoLog.apiResponse(
            "POST",
            url("/auth/login"),
            response.status.value,
            "userId=${dto.user?.id}, username=${dto.user?.username}, metadata=${dto.user?.metadata}",
        )
        AbacoLog.data(LogCategory.AUTH, "login.user.metadata", dto.user?.metadata)
        return dto
    }


    suspend fun resolveEmployeeUnitIds(token: String, userId: String): List<String> {
        val endpoint = url("/sync")
        val response = http.get(endpoint) { bearerAuth(token) }
        if (!response.status.isSuccess()) {
            AbacoLog.apiResponse("GET", endpoint, response.status.value, "employee/POS resolution failed")
            return emptyList()
        }
        val root = response.body<JsonObject>()
        val snapshot = root["snapshot"] as? JsonObject
        val employees = snapshot?.get("employees") as? JsonObject
        AbacoLog.apiResponse("GET", endpoint, response.status.value, "employee/POS resolution response")
        if (employees == null) {
            AbacoLog.w(LogCategory.AUTH, "Sync no contiene snapshot.employees")
            return emptyList()
        }
        for ((employeeId, element) in employees) {
            val employee = element as? JsonObject ?: continue
            val metadata = employee["metadata"] as? JsonObject ?: continue
            val employeeUserId = metadata["userId"]?.jsonPrimitive?.contentOrNull
                ?: metadata["user_id"]?.jsonPrimitive?.contentOrNull
            if (employeeUserId != userId) continue
            val unitIds = ((metadata["unitIds"] ?: metadata["unit_ids"]) as? JsonArray)
                ?.mapNotNull { (it as? JsonPrimitive)?.contentOrNull?.takeIf(String::isNotBlank) }
                .orEmpty()
            AbacoLog.step(LogCategory.AUTH, "EmployeeResolver", "match empleado -> POS", "employeeId=" + employeeId + " userId=" + userId + " unitIds=" + unitIds)
            return unitIds
        }
        AbacoLog.w(LogCategory.AUTH, "No se encontró Employee asociado al usuario en /sync: userId=" + userId)
        return emptyList()
    }

    suspend fun me(token: String): MeResponseDto {
        val response = http.get(url("/auth/me")) {
            bearerAuth(token)
        }
        if (!response.status.isSuccess()) {
            AbacoLog.apiResponse("GET", url("/auth/me"), response.status.value, "me failed")
            error("Sesión inválida o expirada")
        }
        val dto = response.body<MeResponseDto>()
        AbacoLog.apiResponse(
            "GET",
            url("/auth/me"),
            response.status.value,
            "userId=${dto.user?.id}, username=${dto.user?.username}, metadata=${dto.user?.metadata}",
        )
        AbacoLog.data(LogCategory.AUTH, "me.user.metadata", dto.user?.metadata)
        return dto
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
