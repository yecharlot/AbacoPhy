import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.kotlinMultiplatform)
    alias(libs.plugins.androidMultiplatformLibrary)
    alias(libs.plugins.composeMultiplatform)
    alias(libs.plugins.composeCompiler)
    alias(libs.plugins.kotlinSerialization)
    alias(libs.plugins.ksp)
    alias(libs.plugins.androidx.room3)
}

kotlin {
    jvm()

    android {
        namespace = "com.elitec.com.shared"
        compileSdk = libs.versions.android.compileSdk.get().toInt()
        minSdk = libs.versions.android.minSdk.get().toInt()

        compilerOptions {
            jvmTarget = JvmTarget.JVM_11
        }
        androidResources {
            enable = true
        }
        withHostTest {
            isIncludeAndroidResources = true
        }
        withDeviceTestBuilder {
            sourceSetTreeName = "test"
        }.configure {
            instrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        }
    }

    sourceSets {
        androidMain.dependencies {
            implementation(libs.compose.uiToolingPreview)
            implementation(libs.compose.uiTooling)
        }
        commonMain.dependencies {
            // project tooling dependencies
            implementation(libs.compose.runtime)
            implementation(libs.compose.foundation)
            implementation(libs.compose.material3)
            implementation(libs.compose.ui)
            implementation(libs.compose.components.resources)
            implementation(libs.compose.uiToolingPreview)
            implementation(libs.androidx.lifecycle.viewmodelCompose)
            implementation(libs.androidx.lifecycle.runtimeCompose)
            // di
            implementation(libs.koin.multiplatform.core)
            implementation(libs.koin.multiplatform.test)
            implementation(libs.koin.compose.multiplatform)
            implementation(libs.koin.compose.multiplatform.viewmodel)
            implementation(libs.koin.compose.multiplatform.viewmodel.navigation)
            // icons
            implementation(libs.compose.material.icons.extended)
            // navigation
            implementation(libs.jetbrains.navigation3.ui)
            // datetime
            implementation(libs.kotlinx.datetime.ext)
            // networking
            implementation(libs.ktor.client.core)
            implementation(libs.ktor.client.cio)
            implementation(libs.ktor.serialization.kotlinx.json)
            implementation(libs.ktor.client.content.negotiation)
            implementation(libs.ktor.client.logs)
            // ui animations
            implementation(libs.compose.animations)
            // ui lotties file
            implementation(libs.compottie.core)
            implementation(libs.compottie.dot)
            implementation(libs.compottie.resources)
            // adaptative ui
            implementation(libs.composive.ui)
            // validation
            implementation(libs.arrow.core)
            implementation(libs.arrow.fx.coroutines)
            // db
            implementation(libs.androidx.room3.runtime)
            implementation(libs.androidx.sqlite.bundled)
            // logging
            implementation(libs.logging.napier)
            // tooltip
            implementation(libs.multiplatform.tooltip)
        }
        commonTest.dependencies {
            implementation(libs.kotlin.test)
            implementation(libs.koin.multiplatform.test)
        }
    }
}

dependencies {
    androidRuntimeClasspath(libs.compose.uiTooling)
    add("kspAndroid", libs.androidx.room3.compiler)
    add("kspJvm", libs.androidx.room3.compiler)
}

room3 {
    schemaDirectory("$projectDir/schemas")
}
