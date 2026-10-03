package com.elitec.com.feature.identity.domain.repository

import com.elitec.com.feature.identity.domain.entities.ChangePasswordInput
import com.elitec.com.feature.identity.domain.entities.LoginCredentials
import com.elitec.com.feature.identity.domain.entities.Session

interface AuthRepository {
    fun login(credentials: LoginCredentials): Session
    fun logout()
    fun changePassword(input: ChangePasswordInput)
    fun getMe(): Session // Test the token , Restore session from token (GET /auth/me) or fail */
}