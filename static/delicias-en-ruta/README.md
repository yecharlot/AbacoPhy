# Delicias en Ruta

Diseño propio + **lógica completa offline** con persistencia **IPFS local** (cadena de CID en `localStorage`).

No modifica ni depende de la UI Svelte de `main`.

## Flujo

1. Splash animada  
2. Login / sesión (`localStorage`)  
3. Módulos: POS, ventas, online, ingresos/gastos, cuentas, asientos, facturas, carta, almacén, recepciones, transferencias, costos, equipo, nóminas, unidades, usuarios, negocio, reportes, traza IPFS  

## Credenciales offline

| Usuario | Clave |
|---------|--------|
| admin | admin123 |
| caja | caja123 |
| master | AbacoPhy#Master1 |

## Arranque

```bash
DELICIAS_HOME=1 go run ./cmd/abacophy
# http://localhost:8090/delicias-en-ruta/
```

Windows: `dist/delicias-windows/Iniciar-Delicias-en-Ruta.bat`
