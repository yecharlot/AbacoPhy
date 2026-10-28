import org.jetbrains.compose.desktop.application.dsl.TargetFormat

plugins {
    alias(libs.plugins.kotlinJvm)
    alias(libs.plugins.composeMultiplatform)
    alias(libs.plugins.composeCompiler)
}

dependencies {
    implementation(project(":shared"))

    implementation(compose.desktop.currentOs)
    implementation(libs.kotlinx.coroutinesSwing)

    implementation(libs.compose.uiToolingPreview)
}

compose.desktop {
    application {
        mainClass = "com.elitec.com.MainKt"
        // Required on affected Windows/JDK 21 setups for IPv4 multicast sockets.
        jvmArgs += listOf("-Djava.net.preferIPv4Stack=true")

        buildTypes.release.proguard {
            configurationFiles.from(project.file("compose-desktop.pro"))
            obfuscate.set(false)
            optimize.set(false)
        }

        nativeDistributions {
            targetFormats(TargetFormat.Msi, TargetFormat.Exe)
            packageName = "AbacoPOS"
            description = "Compose Multiplatform App"
            copyright = "© 2026 Elitec. All rights reserved."
            vendor = "Elitec"
            packageVersion = "0.1.3"

            appResourcesRootDir.set(project.layout.projectDirectory.dir("resources"))
        }
    }
}