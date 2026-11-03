import org.jetbrains.compose.desktop.application.dsl.TargetFormat
import org.gradle.api.tasks.Copy
import org.gradle.api.file.DuplicatesStrategy

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

/**
 * Backend Go → resources/common/backend
 * (NO usar el nombre "runtime": Compose reserva runtime/ para el JRE).
 */
val launcherRuntimeDir = rootProject.layout.projectDirectory.dir("runtime")
val packagedBackendDir = layout.projectDirectory.dir("resources/common/backend")

val syncLauncherBackend by tasks.registering(Copy::class) {
    group = "build"
    description = "Copia Go+static a resources/common/backend"
    from(launcherRuntimeDir)
    into(packagedBackendDir)
    duplicatesStrategy = DuplicatesStrategy.INCLUDE
}

listOf(
    "prepareAppResources",
    "packageReleaseMsi",
    "packageReleaseExe",
    "packageReleaseDeb",
    "packageReleaseDmg",
    "packageReleaseDistributionForCurrentOS",
    "packageReleaseUberJarForCurrentOS",
    "createDistributable",
    "createReleaseDistributable",
).forEach { taskName ->
    tasks.configureEach {
        if (name == taskName) dependsOn(syncLauncherBackend)
    }
}

compose.desktop {
    application {
        mainClass = "com.elitec.abaco_launcher.MainKt"

        buildTypes.release.proguard {
            isEnabled.set(false)
        }

        nativeDistributions {
            targetFormats(TargetFormat.Msi, TargetFormat.Exe)

            modules("java.net.http")

            // —— Identidad del producto (Control Panel, MSI, menú) ——
            packageName = "AbacoLauncher"
            packageVersion = "0.1.5"
            description = "Orquestador ÁbacoPhy — backend local y consola de arranque"
            vendor = "Elitec"
            copyright = "© 2026 Elitec. Todos los derechos reservados."
            licenseFile.set(rootProject.file("LICENSE").takeIf { it.exists() }
                ?: project.file("LICENSE").takeIf { it.exists() })

            // Recursos empaquetados (backend Go)
            appResourcesRootDir.set(project.layout.projectDirectory.dir("resources"))

            // Icono del .exe, instalador y accesos directos (Windows .ico multi-size)
            // macOS usaría .icns; Linux .png
            windows {
                iconFile.set(project.file("icons/icon.ico"))

                // Accesos directos
                menu = true
                menuGroup = "ÁbacoPhy"
                shortcut = true   // escritorio

                // Instalación por usuario (no pide admin en la mayoría de PCs)
                perUserInstall = true

                // Nombre visible en “Agregar o quitar programas”
                // (packageName se usa como base; upgradeUuid estable permite actualizar)
                // upgradeUuid = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" // opcional, fijo entre versiones
            }

            linux {
                // iconFile.set(project.file("icons/icon-256.png"))
                menuGroup = "ÁbacoPhy"
                shortcut = true
            }

            macOS {
                // iconFile.set(project.file("icons/icon.icns"))
                bundleID = "com.elitec.abacophy.launcher"
            }
        }
    }
}
