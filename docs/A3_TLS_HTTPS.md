# A3 — HTTPS/TLS para AbacoPhy

**Rama:** `security-hardening`  
**Estado:** configuración de referencia preparada; despliegue y validación TLS pendientes.  
**Proxy elegido:** Caddy 2.  
**Alcance:** despliegue Docker/servidor. El Launcher de escritorio en modo LOCAL/LAN conserva HTTP local; esta configuración no cambia su comportamiento.

## 1. Arquitectura

```text
Internet
   |
   | HTTPS :443 / HTTP :80 (redirección automática)
   v
Caddy — certificados ACME, terminación TLS
   |
   | HTTP :10000 en red Docker interna
   v
AbacoPhy — servicio Go
```

El backend no publica el puerto 10000 en el host. Solo Caddy se conecta a AbacoPhy mediante la red Docker interna `backend`. El puerto del backend no debe abrirse en el firewall del host ni publicarse en el router.

Caddy obtiene y renueva certificados automáticamente. El almacenamiento persistente `caddy_data` conserva certificados y estado ACME entre reinicios.

## 2. Archivos preparados

- `deploy/caddy/Caddyfile`: proxy inverso, compresión y cabeceras HTTP básicas.
- `deploy/docker-compose.tls.yml`: backend sin puerto publicado + Caddy expuesto en 80/443.
- `Dockerfile`: imagen de AbacoPhy ya existente; no se modifica en esta etapa.

## 3. Requisitos previos

1. Un dominio o subdominio controlado por el administrador, por ejemplo `abaco.example.com`.
2. Registro DNS A apuntando a la IP pública del servidor. Si existe AAAA, debe apuntar a una IPv6 realmente operativa; eliminarlo si no se usa.
3. Puertos TCP 80 y 443 accesibles desde Internet hacia el host Docker. UDP 443 es opcional y permite HTTP/3.
4. Docker Engine y Docker Compose plugin instalados.
5. Hora del servidor sincronizada.
6. Firewall: permitir entrada pública solo en 80/tcp y 443/tcp (y opcional 443/udp). No permitir 10000/tcp desde Internet ni desde la LAN de usuarios.

La validación inicial más sencilla es usar el DNS en modo directo (sin proxy CDN intermedio) hasta que Caddy haya emitido y validado el certificado. Después puede evaluarse activar el proxy CDN, configurado en modo TLS estricto hacia el origen.

## 4. Configuración y arranque

Desde la raíz del repositorio, crear un archivo `.env` local (no subirlo a Git):

```dotenv
ABACOPHY_DOMAIN=abaco.example.com
```

Sustituir el dominio de ejemplo por el dominio real. El valor no es un secreto, pero el archivo se mantiene fuera del repositorio para no fijar datos de cada instalación.

Validar la configuración y arrancar:

```bash
docker compose --env-file .env -f deploy/docker-compose.tls.yml config
docker compose --env-file .env -f deploy/docker-compose.tls.yml up -d --build
docker compose -f deploy/docker-compose.tls.yml ps
docker compose -f deploy/docker-compose.tls.yml logs -f caddy
```

Abrir `https://abaco.example.com`. Caddy debe registrar la obtención del certificado y servir la aplicación por HTTPS. HTTP en el puerto 80 debe redirigir automáticamente a HTTPS.

## 5. Validación obligatoria

No marcar A3 como cerrado hasta comprobar:

- [ ] `docker compose ... config` termina sin errores.
- [ ] Ambos contenedores arrancan y AbacoPhy pasa healthcheck.
- [ ] El certificado presentado corresponde al dominio y es válido.
- [ ] La cadena de certificados es confiable y no está caducada.
- [ ] HTTP redirige a HTTPS.
- [ ] La aplicación, login y API funcionan detrás del proxy.
- [ ] El puerto 10000 no está publicado por Docker (`docker compose ps`) ni accesible desde una máquina externa.
- [ ] El reinicio de Caddy conserva certificados gracias al volumen persistente.
- [ ] No se transmiten credenciales ni tokens por HTTP.
- [ ] Se revisan cookies y configuración de autenticación antes de habilitar HSTS.

Comandos útiles:

```bash
# Debe mostrar solo los puertos publicados de Caddy: 80 y 443.
docker compose -f deploy/docker-compose.tls.yml ps

# Verificar redirección HTTP.
curl -I http://abaco.example.com

# Verificar HTTPS y cadena de confianza.
curl -Iv https://abaco.example.com

# Inspeccionar el certificado.
openssl s_client -connect abaco.example.com:443 -servername abaco.example.com </dev/null
```

Desde un equipo externo, comprobar que el puerto 10000 no responde. No basta con que el servicio no aparezca en la lista de puertos publicados: también hay que revisar el firewall del host y las reglas del proveedor.

## 6. HSTS

No se añade `Strict-Transport-Security` en esta configuración inicial. Se habilitará en una etapa posterior, solo después de verificar HTTPS de extremo a extremo, redirecciones, subdominios y ausencia de dependencias HTTP. No activar `includeSubDomains` ni `preload` sin una revisión específica del dominio completo.

## 7. Límites y decisiones

- TLS termina en Caddy; el tramo Caddy → AbacoPhy usa HTTP dentro de una red Docker marcada `internal`. Si el proxy y backend se separan en hosts, ese tramo deberá protegerse también (TLS/mTLS o red privada cifrada).
- No se debe ejecutar el contenedor AbacoPhy con un puerto `-p 10000:10000`.
- No reutilizar esta configuración como proxy del Launcher LOCAL/LAN.
- La configuración no reemplaza autenticación, autorización, rate limiting ni firewall.
- El Dockerfile todavía utiliza una imagen base mutable y el contenedor ejecuta con el usuario predeterminado; son hallazgos para la fase F, no se mezclan con A3.

## 8. Criterio de cierre

A3 queda cerrado únicamente después de desplegar en un dominio real y adjuntar evidencia de certificado válido, redirección HTTP→HTTPS, funcionamiento de la aplicación y ausencia de exposición directa del puerto backend.

**Puntuación de hardening:** mantener 55/100 hasta completar las pruebas operativas. La preparación de archivos no equivale a tener TLS desplegado.
