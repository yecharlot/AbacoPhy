# Integración visual

## Tokens esperados
El diseño utiliza los tokens que ya existen en `tokens.css`, especialmente:
- `--surface-1`, `--surface-2`
- `--text-primary`, `--text-muted`
- `--border-subtle`
- `--accent-cyan`, `--accent-lime`, `--accent-purple`, `--accent-red`
- `--button-primary`, `--button-primary-text`
- `--radius-sm`, `--radius-md`, `--radius-lg`

Si alguno no existe en tu versión local, no dupliques un sistema de diseño completo: añade el token equivalente a `tokens.css`.

## Sidebar
Extiende `NavItem` con:
```ts
icon?: IconName;
group?: 'principal' | 'finanzas' | 'operaciones' | 'personas' | 'administracion';
```

Agrupa visualmente:
- Principal: Resumen
- Finanzas: Ingresos, Gastos, Facturación, Cuentas, Reportes
- Operaciones: Catálogo, Almacén, Recepción, Transferencias, POS, Fichas de costo, Fichas de precio, Pedidos, Traza
- Personas: Empleados, Nómina
- Administración: Negocio, Salvas, Usuarios, Master

No alteres la lógica ACL existente.

## AppShell
Añadir conceptualmente:
```svelte
<AmbientBackground />
<Sidebar />
<main>...</main>
<Footer />
<LoadingBar />
```

Mantener la lógica existente de sesión/routing y sólo modificar composición visual.

## Topbar
Priorizar:
- breadcrumb/sección
- estado de conexión
- estado de sincronización
- toggle de tema como botón icon-only
- menú de usuario
- soporte

Los botones icon-only deben tener `aria-label`.

## app.css
Eliminar las reglas del starter de Vite (`.hero`, `.framework`, `.vite`, `#center`, `#next-steps`, `.ticks`, etc.) y conservar únicamente:
- reset
- body
- tipografía
- selección
- scrollbar
- focus-visible
- utilidades globales
- reduced motion
