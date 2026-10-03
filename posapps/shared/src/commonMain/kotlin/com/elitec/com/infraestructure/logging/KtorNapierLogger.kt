package com.elitec.com.infraestructure.logging

import io.ktor.client.plugins.logging.Logger

/**
 * Bridge Ktor Logging → AbacoLog/Napier (mensajes crudos del plugin).
 * El detalle estructurado request/response lo aporta [AbacoHttpLogger] vía HttpSend.
 */
class KtorNapierLogger : Logger {
    override fun log(message: String) {
        AbacoLog.v(LogCategory.HTTP, message)
    }
}
