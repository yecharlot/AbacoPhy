package com.elitec.com.feature.identity.data.repository

import com.elitec.com.feature.identity.domain.entities.ChangePasswordInput
import com.elitec.com.feature.identity.domain.entities.LoginCredentials
import com.elitec.com.feature.identity.domain.entities.Session
import com.elitec.com.feature.identity.domain.repository.AuthRepository
import io.ktor.client.HttpClient

class AuthenticationRepositoryImpl(
    private val _remote: HttpClient
): AuthRepository {

    val authUrl = "URL"
    val endpoint = "endpoint"

    override fun login(credentials: LoginCredentials): Session {
        TODO("Not yet implemented")
    }

    override fun logout() {
        TODO("Not yet implemented")
    }

    override fun changePassword(input: ChangePasswordInput) {
        TODO("Not yet implemented")
    }

    override fun getMe(): Session {
        TODO("Not yet implemented")
    }
}