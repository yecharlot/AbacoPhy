package com.elitec.com

interface Platform {
    val name: String
}

expect fun getPlatform(): Platform