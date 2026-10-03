package com.elitec.com.feature.identity.domain.repository

import com.elitec.com.feature.identity.domain.entities.ChangePasswordInput
import com.elitec.com.feature.identity.domain.entities.LoginCredentials
import com.elitec.com.feature.identity.domain.entities.Session

interface AuthRepository {
    suspend fun login(credentials: LoginCredentials): Session
    suspend fun logout()
    suspend fun getMe(token: String): Session
    suspend fun changePassword(input: ChangePasswordInput)
}
