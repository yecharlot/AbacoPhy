package com.elitec.com.infraestructure.data.database

import com.elitec.com.infraestructure.logging.installAbacoLogging
import com.elitec.com.infraestructure.logging.installAbacoSendInterceptor
import com.elitec.com.infraestructure.settings.AppSettingsRepository
import io.ktor.client.HttpClient
import io.ktor.client.engine.cio.CIO
import io.ktor.client.plugins.DefaultRequest
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.header
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json

/**
 * HttpClient compartido. Identifica el terminal en cada request:
 * - X-AbacoPhy-Client-Id: UUID de instalación
 * - X-AbacoPhy-Client: pos-desktop | pos-android
 */
fun getHttpClient(settings: AppSettingsRepository): HttpClient {
    val clientId = settings.getOrCreateClientInstanceId()
    val platform = settings.getClientPlatform()
    val client = HttpClient(CIO) {
        install(HttpTimeout) {
            connectTimeoutMillis = 4_000
            requestTimeoutMillis = 8_000
            socketTimeoutMillis = 8_000
        }
        installAbacoLogging()
        install(ContentNegotiation) {
            json(
                Json {
                    ignoreUnknownKeys = true
                    prettyPrint = true
                    isLenient = true
                },
            )
        }
        install(DefaultRequest) {
            header("X-AbacoPhy-Client-Id", clientId)
            header("X-AbacoPhy-Client", platform)
        }
    }
    client.installAbacoSendInterceptor()
    return client
}
