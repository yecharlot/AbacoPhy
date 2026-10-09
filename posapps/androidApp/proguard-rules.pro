# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# ============================================================================
# 1. ATRIBUTOS GENERALES Y STACKTRACES (USABILIDAD & DIAGNÓSTICO EN PRODUCCIÓN)
# ============================================================================
# Mantiene números de línea y nombres de archivo en stacktraces para desofuscación
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Preserva anotaciones (indispensable para Compose, Room, Kotlinx Serialization, Koin)
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

# ============================================================================
# 2. KOTLIN & COROUTINES
# ============================================================================
# Necesario para Atomic*FieldUpdater utilizados internamente por kotlinx.coroutines
-keepclassmembers class * extends kotlinx.coroutines.internal.LockFreeLinkedListNode {
    volatile java.lang.Object _next;
    volatile java.lang.Object _prev;
    volatile java.lang.Object _removedRef;
}
-keepclassmembers class * {
    @kotlinx.coroutines.InternalCoroutinesApi *;
}

# ============================================================================
# 3. KOTLINX SERIALIZATION & DTOS (PROYECTO ABACO POS)
# ============================================================================
# Conserva las clases serializables y sus generadores $serializer / Companion
-keepclassmembers class * {
    @kotlinx.serialization.Serializable <fields>;
}
-keepclassmembers class * {
    @kotlinx.serialization.Serializable static ** Companion;
}
-keepclassmembers class * {
    public static ** Companion;
}
-keepnames class * implements kotlinx.serialization.KSerializer
-keepclassmembers class * implements kotlinx.serialization.KSerializer {
    <init>(...);
    public static ** INSTANCE;
}

# Mantener todos los DTOs y modelos de datos de las features
-keep class com.elitec.com.feature.**.data.dto.** { *; }
-keep class com.elitec.com.feature.**.domain.entities.** { *; }

# ============================================================================
# 4. KTOR CLIENT & MOTOR CIO
# ============================================================================
# Ktor utiliza reflexión en sus engines (CIO) y ContentNegotiation
-keep class io.ktor.** { *; }
-dontwarn io.ktor.**

# Motores y dependencias internas de CIO / Coroutines en Ktor
-keep class kotlinx.coroutines.io.** { *; }
-keep class io.ktor.utils.io.** { *; }

# ============================================================================
# 5. ROOM 3 & SQLITE BUNDLED
# ============================================================================
# Mantiene las clases de Base de Datos y DAOs generados por KSP
-keep class * extends androidx.room3.RoomDatabase { <init>(); }

# Clases de la base de datos de AbacoPOS
-keep class com.elitec.com.infraestructure.data.database.** { *; }
-keep class com.elitec.com.feature.**.data.dao.** { *; }

# ============================================================================
# 6. KOIN (INYECCIÓN DE DEPENDENCIAS)
# ============================================================================
# Evita que se eliminen constructores y tipos usados por Koin
-keep class org.koin.** { *; }
-dontwarn org.koin.**
-keepclassmembers class * {
    @org.koin.core.annotation.* *;
}

# ViewModels del proyecto (requieren constructor público preservado para DI)
-keepclassmembers class com.elitec.com.feature.**.viewmodel.** extends androidx.lifecycle.ViewModel {
    <init>(...);
}

# ============================================================================
# 7. COMPOSE Y ANIMACIONES / COMPOTTIE / CHARTS
# ============================================================================
# Mantiene compatibilidad con Jetpack/Compose Multiplatform Runtime
-keepclassmembers class * {
    @androidx.compose.runtime.Composable *;
}

# Compottie (animaciones Lottie)
-keep class io.github.alexzhirkevich.compottie.** { *; }
-dontwarn io.github.alexzhirkevich.compottie.**

# Napier (Logging)
-keep class io.github.aakira.napier.** { *; }
-dontwarn io.github.aakira.napier.**

# Arrow Core (Tipos funcionales como Either, Option)
-keep class arrow.core.** { *; }
-dontwarn arrow.core.**