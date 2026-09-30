# Empleados ↔ Cargo ↔ Usuario ↔ Ubicación

## Relación
Empleado (nómina) y Usuario (auth) son entidades distintas, vinculadas por
`employee.metadata`: `{ positionId, positionName, username, userId, laborStatus, locationLabel }`.

## Nomenclador de cargos
Fuente controlada Cargo → Rol (localStorage por tenant). No texto libre.

## Alta
1. Elegir cargo → rol determinista  
2. Generar 3 usernames libres  
3. `masterStore.addUser` (password temporal `123456`, hash en backend)  
4. `payrollStore.addEmployee` con `role` del cargo + metadata  

## Ubicación
`unitIds[0]` o vacío = Oficina Central. Preparado para POS contextual.

## Reset password
UI solo admin/master; **autorización real en backend** (`editUser` + password).

## Evolución futura (no implementada)
Acceso efectivo = Rol + Ubicación/Área + Permisos del rol (scopes).
