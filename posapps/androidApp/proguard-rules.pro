# =============================================================================
# ÁbacoPOS (KMP) — ProGuard / R8 rules for Android release
# App: com.elitec.com  |  shared: com.elitec.com.**
#
# Objetivo: minify + shrink + ofuscar SIN romper:
#   - kotlinx.serialization (API JSON)
#   - Room 3 / SQLite (sesión, ventas locales)
#   - Ktor CIO (HTTP)
#   - Koin (DI)
#   - Compose Multiplatform / Navigation serializable routes
#   - SharedPreferences (AppSettings)
# =============================================================================

# -----------------------------------------------------------------------------
# 0. Diagnóstico en producción (mapping.txt + stack traces legibles)
# -----------------------------------------------------------------------------
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
-keepattributes *Annotation*, Signature, InnerClasses, EnclosingMethod, Exceptions

# No eliminar metadata de Kotlin (Reflection / serializers / Koin)
-keep class kotlin.Metadata { *; }
-dontwarn kotlin.**
-dontwarn kotlinx.atomicfu.**

# -----------------------------------------------------------------------------
# 1. Kotlin Coroutines
# -----------------------------------------------------------------------------
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
-keepclassmembers class * extends kotlinx.coroutines.internal.LockFreeLinkedListNode {
    volatile java.lang.Object _next;
    volatile java.lang.Object _prev;
    volatile java.lang.Object _removedRef;
}
-dontwarn kotlinx.coroutines.**

# -----------------------------------------------------------------------------
# 2. kotlinx.serialization (DTOs API + rutas Navigation)
# -----------------------------------------------------------------------------
# Serializers generados y Companion
-keepattributes RuntimeVisibleAnnotations,AnnotationDefault
-keepclassmembers @kotlinx.serialization.Serializable class ** {
    *** Companion;
    *** $serializer;
    *** serializer(...);
}
-keepclassmembers class **$$serializer {
    *** INSTANCE;
}
-keepnames class kotlinx.serialization.** { *; }
-keepclassmembers class kotlinx.serialization.json.** { *; }
-dontwarn kotlinx.serialization.**

# Paquete de features: DTOs y entidades de dominio expuestas a JSON
-keep class com.elitec.com.feature.**.data.dto.** { *; }
-keep class com.elitec.com.feature.**.domain.** { *; }

# Rutas @Serializable (Navigation 3 / saved state)
-keep class com.elitec.com.infraestructure.ui.navigation.** { *; }

# Enums usados en serialización / UI state
-keepclassmembers enum com.elitec.com.** {
    public static **[] values();
    public static ** valueOf(java.lang.String);
    **[] $VALUES;
    public *;
}

# -----------------------------------------------------------------------------
# 3. Ktor client (CIO) + ContentNegotiation
# -----------------------------------------------------------------------------
-keep class io.ktor.** { *; }
-keep class kotlinx.coroutines.io.** { *; }
-keep class io.ktor.utils.io.** { *; }
-dontwarn io.ktor.**
-dontwarn org.slf4j.**
-dontwarn org.bouncycastle.**

# ServiceLoader (engines / plugins)
-keepnames class * implements java.util.ServiceLoader
-keep class * implements io.ktor.client.engine.HttpClientEngineFactory { *; }

# -----------------------------------------------------------------------------
# 4. Room 3 + SQLite bundled
# -----------------------------------------------------------------------------
-keep class * extends androidx.room3.RoomDatabase { <init>(); }
-keep @androidx.room3.Entity class * { *; }
-keep @androidx.room3.Dao class * { *; }
-keep @androidx.room3.Database class * { *; }
-keep @androidx.room3.TypeConverter class * { *; }
-keepclassmembers class * {
    @androidx.room3.* <methods>;
}

# Código generado KSP / Room
-keep class * extends androidx.room3.RoomDatabase
-keep class **_Impl { *; }
-keep class **_Impl_* { *; }

# Paquetes concretos del proyecto
-keep class com.elitec.com.infraestructure.data.database.** { *; }
-keep class com.elitec.com.feature.**.data.dao.** { *; }
-keep class com.elitec.com.feature.**.data.**Entity** { *; }
-dontwarn androidx.room3.**
-dontwarn androidx.sqlite.**

# Fallback por si el artefacto resuelve como androidx.room (no room3)
-keep class * extends androidx.room.RoomDatabase { <init>(); }
-keep @androidx.room.Entity class * { *; }
-keep @androidx.room.Dao class * { *; }

# -----------------------------------------------------------------------------
# 5. Koin DI
# -----------------------------------------------------------------------------
-keep class org.koin.** { *; }
-keepclassmembers class * {
    @org.koin.core.annotation.* *;
}
-dontwarn org.koin.**

# ViewModels / factories registrados en modules (constructores públicos)
-keep class com.elitec.com.feature.**.ui.viewmodel.** { <init>(...); *; }
-keep class com.elitec.com.feature.**.viewmodel.** { <init>(...); *; }
-keep class com.elitec.com.**.di.** { *; }

# Application + Activity (entrada Android)
-keep class com.elitec.com.AbacoPosApp { *; }
-keep class com.elitec.com.MainActivity { *; }
-keep class com.elitec.com.infraestructure.** { *; }

# -----------------------------------------------------------------------------
# 6. Compose Multiplatform / Compose Android
# -----------------------------------------------------------------------------
-keep class androidx.compose.** { *; }
-keepclassmembers class * {
    @androidx.compose.runtime.Composable <methods>;
}
-dontwarn androidx.compose.**

# -----------------------------------------------------------------------------
# 7. Librerías UI / utilidades del shared
# -----------------------------------------------------------------------------
# Compottie (Lottie)
-keep class io.github.alexzhirkevich.compottie.** { *; }
-dontwarn io.github.alexzhirkevich.compottie.**

# Napier
-keep class io.github.aakira.napier.** { *; }
-dontwarn io.github.aakira.napier.**

# Arrow
-keep class arrow.core.** { *; }
-keep class arrow.fx.** { *; }
-dontwarn arrow.**

# Charts / tooltip / composive (por si usan reflection)
-dontwarn io.github.**
-dontwarn com.github.**

# -----------------------------------------------------------------------------
# 8. Recursos y shrink
# -----------------------------------------------------------------------------
# No eliminar clases referenciadas solo desde XML/manifest
-keepclassmembers class **.R$* {
    public static <fields>;
}

# -----------------------------------------------------------------------------
# 9. Optimización: conservadora (evita bugs sutiles en KMP)
# -----------------------------------------------------------------------------
# Si aparece ClassNotFoundException tras minify, comentar las dos siguientes.
# -optimizations !code/simplification/arithmetic,!code/allocation/variable
-allowaccessmodification
-repackageclasses 'o'

# Log de R8: útil en CI la primera vez
# -printconfiguration build/outputs/mapping/release/configuration.txt
# -printmapping build/outputs/mapping/release/mapping.txt
