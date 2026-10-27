package com.elitec.abaco_launcher

interface Platform {
    val name: String
}

expect fun getPlatform(): Platform