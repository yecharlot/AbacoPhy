# Facturación + Nómina

## Problema resuelto
Mappers FE usaban campos distintos al Go (`customer_name` vs `client_name`, `first_name` vs `name`, etc.).

## API
| Acción | Path |
|--------|------|
| Facturas | GET/POST `/invoices` body `client_name`, `lines[{description,qty,unit_price}]` |
| Empleados | GET/POST `/payroll/employees` body `name`, `salary`, `ci?`… |
| Liquidaciones | GET/POST `/payroll/payslips` body `employee_id`, `gross?`, `other_deductions?` |

## Criterio
- [x] Emitir factura usable
- [x] Alta trabajador usable
- [x] Generar liquidación con preview SS
