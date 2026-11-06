# B3 — Protección contra ataques de fuerza bruta

**Alcance:** endpoint `POST /api/v1/auth/login`, rama `security-hardening`.

## Controles implementados

- Dos contadores independientes: IP del peer TCP y nombre de usuario normalizado. No se usa una clave compuesta IP+usuario, porque permitiría cambiar de usuario para evadir el límite por origen.
- Por IP: 30 autenticaciones fallidas en una ventana móvil de 5 minutos.
- Por usuario: backoff progresivo después de 3 fallos: 1, 2, 4, 8, 16 y 30 segundos (tope).
- Ventana de fallos por usuario: 15 minutos. Al expirar, el estado se reinicia.
- Un login correcto elimina el backoff asociado al nombre de usuario.
- Los límites responden con HTTP 429 y un mensaje genérico. Las credenciales inválidas, usuario inexistente y cuenta inactiva mantienen la misma respuesta HTTP 401.
- Los fallos se registran sin contraseña ni token; el identificador de usuario se representa mediante una etiqueta hash corta.
- El límite IP usa `RemoteAddr` y no confía en `X-Forwarded-For`. Si se despliega detrás de proxy, debe añadirse una lista explícita de proxies confiables antes de aceptar cabeceras reenviadas.
- Los contadores son de proceso, temporales y no se persisten. Un reinicio limpia el estado. Para despliegues multiinstancia se necesitaría un almacén compartido con operaciones atómicas.

## Decisiones para evitar denegación de servicio

No se bloquea permanentemente una cuenta ni se desactiva el usuario por fallos de autenticación. El backoff limita temporalmente los intentos y expira automáticamente. El límite por IP también frena el password spraying, mientras el límite por usuario protege frente a intentos distribuidos desde varias IP.

## Límites conocidos

- El estado en memoria no se comparte entre instancias y se reinicia al reiniciar el proceso.
- La IP directa es correcta para LAN/directo. Detrás de reverse proxy, varios clientes podrían compartir la IP del proxy hasta configurar confianza explícita.
- No se agrega CAPTCHA ni MFA en esta etapa.
- El límite de 30 fallos por IP puede afectar a redes NAT muy concurridas; debe verificarse con el patrón real de uso antes de endurecerlo.
- La memoria se depura por ventanas temporales; conviene validar carga concurrente y volumen alto de claves antes de un despliegue público.

## Pruebas

- Backoff progresivo y reset tras login correcto.
- Buckets independientes por IP y usuario.
- Expiración del estado.
- Resistencia a `X-Forwarded-For` falsificado.

**Criterio de cierre:** CI Go correcto y prueba operativa concurrente en el equipo objetivo.