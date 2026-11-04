# A3 — Transporte de red y alcance de HTTPS

**Rama:** `security-hardening`  
**Estado:** alcance simplificado por decisión del proyecto.  
**Decisión:** AbacoPhy no utilizará dominio propio ni desplegará un reverse proxy TLS como requisito.

## 1. Alcance acordado

No se implementará una infraestructura HTTPS pública basada en dominio, DNS, ACME o renovación automática de certificados. Se retiran Caddy y el Compose específico de TLS porque añadirían mantenimiento y dependencias que el proyecto no utilizará.

La política de red vigente en A2 será la base:

- **LOCAL:** acceso en el mismo equipo mediante `127.0.0.1`. Es el modo recomendado para el uso individual.
- **LAN:** acceso desde equipos de una red privada confiable, solo cuando el usuario lo habilite expresamente. El firewall debe limitar el puerto a la subred autorizada.
- **Internet:** no publicar directamente el backend HTTP ni abrir el puerto de AbacoPhy al público.

## 2. Consecuencia de seguridad

HTTP en LOCAL no sale del equipo y es suficiente para el escenario local previsto. En LAN, el tráfico HTTP no está cifrado: otros equipos o usuarios con capacidad de observar la red podrían capturar credenciales, tokens o datos de sesión.

Por tanto:

- Usar LAN únicamente en redes privadas y confiables.
- No utilizar redes Wi-Fi públicas o compartidas para acceder a AbacoPhy.
- No interpretar la selección LAN como autorización para publicar el servicio en Internet.
- Si en el futuro se requiere acceso remoto o redes no confiables, deberá aprobarse una solución de transporte cifrado adecuada (por ejemplo, VPN o TLS gestionado por infraestructura externa). Eso será una decisión nueva, no parte de esta etapa.

## 3. Elementos retirados

Se eliminan de esta rama los artefactos que exigían dominio y certificados públicos:

- `deploy/caddy/Caddyfile`
- `deploy/docker-compose.tls.yml`

No se modifica el comportamiento del Launcher ni la política LOCAL/LAN implementada en A2.

## 4. Validación pendiente

A3 no se considera una implementación de HTTPS ni una certificación de transporte seguro. La validación aplicable queda limitada a:

- [ ] Confirmar LOCAL escuchando solo en loopback IPv4/IPv6 según la implementación.
- [ ] Confirmar que LOCAL no acepta conexiones desde otro equipo.
- [ ] Confirmar que LAN requiere selección explícita.
- [ ] Confirmar que el firewall limita LAN a la subred privada prevista.
- [ ] Confirmar que no existe publicación accidental del puerto del backend hacia Internet.

Las pruebas operativas de A2 siguen siendo necesarias. No se debe aumentar la puntuación de hardening por retirar la configuración TLS.

## 5. Criterio de cierre

La etapa A3 queda **cerrada por alcance**, no por haber desplegado HTTPS. Se registra como riesgo aceptado y condicionado: el uso LAN transmite HTTP sin cifrar y solo es admisible dentro de una red privada confiable. Cualquier necesidad futura de acceso remoto requiere reabrir esta decisión.

**Puntuación de hardening:** se mantiene en 55/100; no hay incremento por esta simplificación.
