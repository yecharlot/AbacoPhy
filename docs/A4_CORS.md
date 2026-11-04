# A4 — Política CORS de AbacoPhy

**Rama:** `security-hardening`  
**Estado:** implementación preparada; ejecución de pruebas y validación manual pendientes.

## 1. Hallazgo

El middleware global anterior añadía `Access-Control-Allow-Origin: *` a todas las respuestas y contestaba cualquier solicitud `OPTIONS` con HTTP 204, sin validar el origen, el método solicitado ni los headers.

Esto habilitaba lectura cross-origin desde cualquier sitio en navegadores. Aunque no reemplaza la autenticación de la API, ampliaba innecesariamente la superficie de interacción desde sitios externos.

## 2. Arquitectura comprobada

Los componentes actuales permiten mantener same-origin:

- El backend Go sirve la PWA y los recursos de la webapp, además de la API.
- Vite redirige `/api` al backend mediante su proxy de desarrollo.
- El shell Electron inicia el backend local y carga la aplicación desde la misma URL HTTP local.

No se encontró una necesidad confirmada de que un frontend web independiente consuma la API desde otro origen.

## 3. Decisión

Se elimina el middleware CORS global. AbacoPhy no emite cabeceras `Access-Control-Allow-*` ni autoriza preflights cross-origin.

No se configura una allowlist por ahora porque no hay un origen externo legítimo que necesite acceso. Las solicitudes same-origin continúan funcionando normalmente. Las aplicaciones nativas (por ejemplo, clientes Kotlin/Ktor) no están sujetas a CORS del navegador.

Si se introduce un frontend web separado, deberá configurarse una allowlist de orígenes exactos, métodos y headers estrictamente necesarios. Nunca reintroducir `*` como solución rápida.

## 4. Cambios realizados

- Eliminado `withCORS` de `internal/api/server.go`.
- El handler ya no envuelve el mux con middleware CORS.
- Añadido `internal/api/cors_test.go` para verificar:
  - solicitudes same-origin siguen respondiendo;
  - un origen externo no recibe `Access-Control-Allow-Origin`;
  - el preflight cross-origin no recibe permisos CORS.

## 5. Validación pendiente

- [ ] Ejecutar `go test ./...`.
- [ ] Ejecutar CI Go.
- [ ] Comprobar login y navegación de la PWA desde Launcher LOCAL.
- [ ] Comprobar el funcionamiento previsto desde Launcher LAN.
- [ ] Comprobar que Vite continúa usando su proxy `/api` en desarrollo.

No se declara A4 validado hasta completar estas pruebas.

## 6. Límites de CORS

CORS es una protección aplicada por navegadores. No autentica clientes ni impide que herramientas como curl, scripts o aplicaciones nativas llamen directamente a la API. La autenticación, autorización, validación de entradas y política de red siguen siendo controles independientes.

**Puntuación de hardening:** mantener 55/100 hasta validar el cambio y completar los controles pendientes.
