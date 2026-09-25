# Cablear FacturasScreen en App.svelte

```svelte
<FacturasScreen
  store={invoicingStore}
  payrollStore={payrollStore}
  warehouseStore={warehouseStore}
  issuerName={sessionState.session?.tenantName ?? 'Negocio'}
/>
```

## Empleados ↔ unidades
En el formulario de empleados, marcar `unitIds` (checkboxes de unidades de venta del **mismo** negocio).

## Multi-negocio
En ÁbacoPhy cada sesión está ligada a **un tenant**. Un empleado no vive en varios negocios a la vez; para otro negocio hay que iniciar sesión en ese tenant. Las “unidades de venta” son los puntos del negocio actual.
