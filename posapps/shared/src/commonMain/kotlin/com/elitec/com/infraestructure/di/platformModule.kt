package com.elitec.com.infraestructure.di

import org.koin.core.module.Module

/**
 * Módulo específico de plataforma (Room builder, Context, etc.).
 * actual en androidMain / jvmMain.
 */
expect val platformModule: Module
