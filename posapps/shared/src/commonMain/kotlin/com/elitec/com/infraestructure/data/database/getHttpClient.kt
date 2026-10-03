package com.elitec.com.infraestructure.data.database

import io.ktor.client.HttpClient
import io.ktor.client.engine.cio.CIO
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.logging.LogLevel
import io.ktor.client.plugins.logging.Logging
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json

fun getHttpClient(): HttpClient {
    return HttpClient(CIO) {
        install(HttpTimeout) {
            connectTimeoutMillis = 4000
            requestTimeoutMillis = 8000
            socketTimeoutMillis = 8000
        }
        install(Logging) {
            level = LogLevel.ALL
            /*logger = object : Logger {
                override fun log(message: String) {
                    Napier.d(tag = "KtorHTTP", message = message)
                }
            }*/
        }
        install(ContentNegotiation) {
            json(
                Json {
                    ignoreUnknownKeys = true
                    prettyPrint = true
                    isLenient = true
                }
            )
        }
    }
}