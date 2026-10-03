package com.elitec.com.feature.pos.data.dataSource

import com.elitec.com.feature.identity.domain.repository.SessionRepository
import com.elitec.com.feature.pos.data.dto.SaleDto
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.bearerAuth
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.http.isSuccess
import io.ktor.http.parameters

class RemoteSalesDataSource(
    private val _remote: HttpClient,
    private val _sessionControl: SessionRepository
) {
    private val _baseUrl = ""
    private val _endpoint = "/sale"

    init {
        require(_baseUrl.isNotEmpty()) { "La URL Base de la API no esta configurada" }
    }

    suspend fun save(sale: SaleDto, tokenAuth: String, onSaveSuccess: suspend () -> Unit) {
        val response = _remote.post(_baseUrl+_endpoint) {
            bearerAuth(
                tokenAuth
            )
        }
        when(response.status.isSuccess()) {
            true -> onSaveSuccess()
            else -> {
                throw Exception("No se ha guardado la venta correctamente")
            }
        }
    }

    suspend fun getById(saleId: String): SaleDto? {
        val response = _remote.get(_baseUrl+_endpoint) {
            bearerAuth(
                _sessionControl.getTokenSession() ?: throw Exception("La sesión no tiene token activo")
            )
        }

        if(!response.status.isSuccess())
            throw Exception(
                "No se pudo obtener la venta solicitada, error en la llamada al servidor con Código: 001"
            )
        return response.body()
    }

    suspend fun getSaleList(posId: String): List<SaleDto> {

        val response = when (posId.isEmpty()) {
            true -> _remote.get(_baseUrl+_endpoint) {
                bearerAuth(
                    _sessionControl.getTokenSession() ?: throw Exception("La sesión no tiene token activo")
                )
            }
            else -> _remote.get(_baseUrl) {
                bearerAuth(
                    _sessionControl.getTokenSession() ?: throw Exception("La sesión no tiene token activo")
                )
                parameters {
                    mapOf("posId" to posId)
                }
            }
        }
        when (response.status.isSuccess()) {
            true -> {
                return response.body()
            }
            else -> {
                throw Exception(
                    "No se pudo obtener la lista de ventas solicitada, error en la llamada al servidor con Código: 001"
                )
            }
        }
    }
}