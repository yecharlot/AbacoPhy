package com.elitec.com.infraestructure.data.database

import com.elitec.com.infraestructure.logging.installAbacoLogging
import com.elitec.com.infraestructure.logging.installAbacoSendInterceptor
import io.ktor.client.HttpClient
import io.ktor.client.engine.cio.CIO
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json

fun getHttpClient(): HttpClient {
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
    }
    client.installAbacoSendInterceptor()
    return client
}
