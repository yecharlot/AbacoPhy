package com.elitec.com.infraestructure.logging

/**
 * Categorías de log con icono para localizar rápido el origen del fallo.
 */
enum class LogCategory(val icon: String, val tag: String) {
    APP("📱", "Abaco.App"),
    NAV("🧭", "Abaco.Nav"),
    AUTH("🔐", "Abaco.Auth"),
    API("🌐", "Abaco.Api"),
    HTTP("📡", "Abaco.Http"),
    DATA("📦", "Abaco.Data"),
    DB("💾", "Abaco.Db"),
    FLOW("⚡", "Abaco.Flow"),
    UI("🎨", "Abaco.Ui"),
    DI("🧩", "Abaco.Di"),
    SYNC("🔄", "Abaco.Sync"),
    POS("🛒", "Abaco.Pos"),
}
