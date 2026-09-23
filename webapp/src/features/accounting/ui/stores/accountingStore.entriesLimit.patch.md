En `loadDashboard`, cambia:

```ts
deps.listEntries.execute({ limit: 10 })
```

por:

```ts
deps.listEntries.execute({ limit: 200 })
```

para que Resumen muestre el seed completo.
