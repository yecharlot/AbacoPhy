package domain

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

const IdempotencyMaxKeys = 5000

// SnapshotIntegrityError describe fallo de integridad o estructura.
type SnapshotIntegrityError struct {
	Reason string
}

func (e *SnapshotIntegrityError) Error() string {
	return "integridad de salva: " + e.Reason
}

// ContentSHA256 hex del payload canónico (sin RootCID para estabilidad).
func ContentSHA256(snap *StoreSnapshot) (string, []byte, error) {
	if snap == nil {
		return "", nil, &SnapshotIntegrityError{Reason: "snapshot nulo"}
	}
	clone := *snap
	clone.RootCID = ""
	raw, err := json.Marshal(&clone)
	if err != nil {
		return "", nil, err
	}
	sum := sha256.Sum256(raw)
	return hex.EncodeToString(sum[:]), raw, nil
}

// ValidateSnapshotStructure comprueba mínimos para restaurar con seguridad.
func ValidateSnapshotStructure(snap *StoreSnapshot) error {
	if snap == nil {
		return &SnapshotIntegrityError{Reason: "snapshot nulo"}
	}
	if strings.TrimSpace(snap.Tenant.ID) == "" && strings.TrimSpace(snap.Tenant.Slug) == "" && strings.TrimSpace(snap.Tenant.Name) == "" {
		return &SnapshotIntegrityError{Reason: "tenant vacío"}
	}
	if snap.Users == nil {
		snap.Users = map[string]*User{}
	}
	if snap.Accounts == nil {
		snap.Accounts = map[string]*Account{}
	}
	if snap.Inventory == nil {
		snap.Inventory = map[string]*InventoryItem{}
	}
	if snap.Products == nil {
		snap.Products = map[string]*Product{}
	}
	if snap.Idempotency == nil {
		snap.Idempotency = map[string]string{}
	}
	if snap.Rev < 0 {
		return &SnapshotIntegrityError{Reason: "rev inválida"}
	}
	return nil
}


 
// BindSnapshotToTenant valida el ámbito de cada registro y normaliza los
// TenantID vacíos de snapshots legacy. Nunca reasigna registros que declaran
// explícitamente pertenecer a otro tenant.
func BindSnapshotToTenant(snap *StoreSnapshot, tenantID string) error {
	if snap == nil || strings.TrimSpace(tenantID) == "" {
		return &SnapshotIntegrityError{Reason: "tenant destino vacío"}
	}
	if snap.Tenant.ID != "" && snap.Tenant.ID != tenantID {
		return &SnapshotIntegrityError{Reason: "el snapshot pertenece a otro tenant"}
	}
	snap.Tenant.ID = tenantID
	bind := func(id *string, kind string) error {
		if *id != "" && *id != tenantID {
			return &SnapshotIntegrityError{Reason: kind + " pertenece a otro tenant"}
		}
		*id = tenantID
		return nil
	}
	for _, v := range snap.Users { if v != nil { if err := bind(&v.TenantID, "usuario"); err != nil { return err } } }
	for _, v := range snap.Accounts { if v != nil { if err := bind(&v.TenantID, "cuenta"); err != nil { return err } } }
	for i := range snap.Entries { if err := bind(&snap.Entries[i].TenantID, "asiento"); err != nil { return err } }
	for _, v := range snap.Inventory { if v != nil { if err := bind(&v.TenantID, "inventario"); err != nil { return err } } }
	for i := range snap.InvMoves { if err := bind(&snap.InvMoves[i].TenantID, "movimiento de inventario"); err != nil { return err } }
	for _, v := range snap.Employees { if v != nil { if err := bind(&v.TenantID, "empleado"); err != nil { return err } } }
	for i := range snap.Payslips { if err := bind(&snap.Payslips[i].TenantID, "nómina"); err != nil { return err } }
	for i := range snap.Invoices { if err := bind(&snap.Invoices[i].TenantID, "factura"); err != nil { return err } }
	for i := range snap.AuditLog { if err := bind(&snap.AuditLog[i].TenantID, "auditoría"); err != nil { return err } }
	for _, v := range snap.Products { if v != nil { if err := bind(&v.TenantID, "producto"); err != nil { return err } } }
	for _, v := range snap.SalesUnits { if v != nil { if err := bind(&v.TenantID, "unidad de venta"); err != nil { return err } } }
	for i := range snap.Receptions { if err := bind(&snap.Receptions[i].TenantID, "recepción"); err != nil { return err } }
	for i := range snap.Transfers { if err := bind(&snap.Transfers[i].TenantID, "transferencia"); err != nil { return err } }
	for i := range snap.POSSales { if err := bind(&snap.POSSales[i].TenantID, "venta POS"); err != nil { return err } }
	for _, v := range snap.CostSheets { if v != nil { if err := bind(&v.TenantID, "ficha de costo"); err != nil { return err } } }
	for i := range snap.StockLedger { if err := bind(&snap.StockLedger[i].TenantID, "kardex"); err != nil { return err } }
	for _, v := range snap.JobPositions { if v != nil { if err := bind(&v.TenantID, "cargo"); err != nil { return err } } }
	for _, v := range snap.MeasureUnits { if v != nil { if err := bind(&v.TenantID, "unidad de medida"); err != nil { return err } } }
	for _, v := range snap.PriceSheets { if v != nil { if err := bind(&v.TenantID, "ficha de precio"); err != nil { return err } } }
	for i := range snap.OnlineOrders { if err := bind(&snap.OnlineOrders[i].TenantID, "pedido online"); err != nil { return err } }
	return nil
}


 
// ValidateSnapshotReferences verifica que las referencias internas de un
// snapshot resuelvan dentro del mismo tenant. Un ID ajeno o inexistente no
// puede convertirse en una relación válida por el simple hecho de importar.
func ValidateSnapshotReferences(snap *StoreSnapshot) error {
	if snap == nil { return &SnapshotIntegrityError{Reason: "snapshot nulo"} }
	missing := func(kind, id string) error {
		return &SnapshotIntegrityError{Reason: kind + " no existe dentro del tenant: " + id}
	}
	for id, user := range snap.Users { if user != nil && user.ID != id { return &SnapshotIntegrityError{Reason: "clave/ID de usuario no coincide: " + id} } }
	for id, account := range snap.Accounts { if account != nil && account.ID != id { return &SnapshotIntegrityError{Reason: "clave/ID de cuenta no coincide: " + id} } }
	for id, item := range snap.Inventory { if item != nil && item.ID != id { return &SnapshotIntegrityError{Reason: "clave/ID de inventario no coincide: " + id} } }
	for id, employee := range snap.Employees { if employee != nil && employee.ID != id { return &SnapshotIntegrityError{Reason: "clave/ID de empleado no coincide: " + id} } }
	for id, product := range snap.Products { if product != nil && product.ID != id { return &SnapshotIntegrityError{Reason: "clave/ID de producto no coincide: " + id} } }
	for id, unit := range snap.SalesUnits { if unit != nil && unit.ID != id { return &SnapshotIntegrityError{Reason: "clave/ID de unidad de venta no coincide: " + id} } }
	for id, sheet := range snap.CostSheets { if sheet != nil && (sheet.ProductID != id || sheet.ProductID == "") { return &SnapshotIntegrityError{Reason: "clave/producto de ficha de costo no coincide: " + id} } }
	for id, position := range snap.JobPositions { if position != nil && position.ID != id { return &SnapshotIntegrityError{Reason: "clave/ID de cargo no coincide: " + id} } }
	for id, unit := range snap.MeasureUnits { if unit != nil && unit.ID != id { return &SnapshotIntegrityError{Reason: "clave/ID de unidad de medida no coincide: " + id} } }
	for id, account := range snap.Accounts {
		if account != nil && account.ParentID != "" {
			if account.ParentID == id || snap.Accounts[account.ParentID] == nil {
				return missing("cuenta padre", account.ParentID)
			}
		}
	}
	for _, entry := range snap.Entries {
		if entry.AccountID != "" && snap.Accounts[entry.AccountID] == nil {
			return missing("cuenta del asiento", entry.AccountID)
		}
		if entry.Counterpart != "" && snap.Accounts[entry.Counterpart] == nil {
			return missing("contrapartida del asiento", entry.Counterpart)
		}
	}
	for _, move := range snap.InvMoves {
		if move.ItemID != "" && snap.Inventory[move.ItemID] == nil {
			return missing("artículo del movimiento", move.ItemID)
		}
	}
	for _, slip := range snap.Payslips {
		if slip.EmployeeID != "" && snap.Employees[slip.EmployeeID] == nil {
			return missing("empleado de nómina", slip.EmployeeID)
		}
	}
	// La relación empleado → usuario/PDV se guarda en metadata y también
	// forma parte del límite entre tenants: validar ambos extremos locales.
	for employeeID, employee := range snap.Employees {
		if employee == nil { continue }
		if rawUserID, ok := employee.Metadata["userId"]; ok {
			userID, valid := rawUserID.(string)
			if !valid { return &SnapshotIntegrityError{Reason: "userId inválido en empleado: " + employeeID} }
			if strings.TrimSpace(userID) != "" {
				user := snap.Users[userID]
				if user == nil || user.ID != userID { return missing("usuario asignado al empleado", userID) }
			}
		}
		if rawUnitIDs, ok := employee.Metadata["unitIds"]; ok {
			var unitIDs []string
			switch values := rawUnitIDs.(type) {
			case []string:
				unitIDs = values
			case []any:
				for _, value := range values {
					unitID, valid := value.(string)
					if !valid { return &SnapshotIntegrityError{Reason: "unitIds inválido en empleado: " + employeeID} }
					unitIDs = append(unitIDs, unitID)
				}
			case nil:
			default:
				return &SnapshotIntegrityError{Reason: "unitIds inválido en empleado: " + employeeID}
			}
			for _, unitID := range unitIDs {
				if strings.TrimSpace(unitID) == "" || snap.SalesUnits[unitID] == nil {
					return missing("unidad asignada al empleado", unitID)
				}
			}
		}
	}
	for _, reception := range snap.Receptions {
		for _, line := range reception.Lines {
			if line.ProductID != "" && snap.Products[line.ProductID] == nil {
				return missing("producto de recepción", line.ProductID)
			}
		}
	}
	for _, transfer := range snap.Transfers {
		if transfer.UnitID != "" && snap.SalesUnits[transfer.UnitID] == nil {
			return missing("unidad de transferencia", transfer.UnitID)
		}
		for _, line := range transfer.Lines {
			if line.ProductID != "" && snap.Products[line.ProductID] == nil {
				return missing("producto de transferencia", line.ProductID)
			}
		}
	}
	for _, sale := range snap.POSSales {
		if sale.UnitID != "" && snap.SalesUnits[sale.UnitID] == nil {
			return missing("unidad de venta", sale.UnitID)
		}
		for _, line := range sale.Lines {
			if line.ProductID != "" && snap.Products[line.ProductID] == nil {
				return missing("producto de venta", line.ProductID)
			}
		}
	}
	for _, sheet := range snap.CostSheets {
		if sheet == nil { continue }
		if sheet.ProductID != "" && snap.Products[sheet.ProductID] == nil {
			return missing("producto de ficha de costo", sheet.ProductID)
		}
		for _, component := range sheet.Components {
			if component.ProductID != "" && snap.Products[component.ProductID] == nil {
				return missing("componente de ficha de costo", component.ProductID)
			}
		}
	}
	for _, sheet := range snap.PriceSheets {
		if sheet != nil && sheet.ProductID != "" && snap.Products[sheet.ProductID] == nil {
			return missing("producto de ficha de precio", sheet.ProductID)
		}
	}
	for productID, stock := range snap.WarehouseStock {
		if stock != nil {
			if stock.ProductID != "" && stock.ProductID != productID {
				return &SnapshotIntegrityError{Reason: "clave/producto de stock de almacén no coincide: " + productID}
			}
			if snap.Products[productID] == nil { return missing("producto de stock de almacén", productID) }
		}
	}
	for _, stock := range snap.UnitStocks {
		if stock.UnitID != "" && snap.SalesUnits[stock.UnitID] == nil {
			return missing("unidad de stock", stock.UnitID)
		}
		if stock.ProductID != "" && snap.Products[stock.ProductID] == nil {
			return missing("producto de stock", stock.ProductID)
		}
	}
	for _, movement := range snap.StockLedger {
		if movement.ProductID != "" && snap.Products[movement.ProductID] == nil {
			return missing("producto de kardex", movement.ProductID)
		}
		if movement.UnitID != "" && snap.SalesUnits[movement.UnitID] == nil {
			return missing("unidad de kardex", movement.UnitID)
		}
	}
	for _, order := range snap.OnlineOrders {
		for _, line := range order.Lines {
			if line.ProductID != "" && snap.Products[line.ProductID] == nil {
				return missing("producto de pedido online", line.ProductID)
			}
		}
	}
	return nil
}


 // ValidateEmployeeAssignments valida las referencias operativas de un empleado
 // antes de que un endpoint modifique el snapshot activo.
 func ValidateEmployeeAssignments(snap *StoreSnapshot, employeeID string, metadata Metadata) error {
 	if snap == nil { return &SnapshotIntegrityError{Reason: "snapshot nulo"} }
 	if rawUserID, ok := metadata["userId"]; ok {
 		userID, valid := rawUserID.(string)
 		if !valid { return &SnapshotIntegrityError{Reason: "userId inválido en empleado: " + employeeID} }
 		if strings.TrimSpace(userID) != "" {
 			user := snap.Users[userID]
 			if user == nil || user.ID != userID || (user.TenantID != "" && user.TenantID != snap.Tenant.ID) {
 				return &SnapshotIntegrityError{Reason: "usuario asignado al empleado no existe dentro del tenant: " + userID}
 			}
 		}
 	}
 	if rawUnitIDs, ok := metadata["unitIds"]; ok {
 		var unitIDs []string
 		switch values := rawUnitIDs.(type) {
 		case []string: unitIDs = values
 		case []any:
 			for _, value := range values {
 				unitID, valid := value.(string)
 				if !valid { return &SnapshotIntegrityError{Reason: "unitIds inválido en empleado: " + employeeID} }
 				unitIDs = append(unitIDs, unitID)
 			}
 		case nil:
 		default: return &SnapshotIntegrityError{Reason: "unitIds inválido en empleado: " + employeeID}
 		}
 		for _, unitID := range unitIDs {
 			unit := snap.SalesUnits[unitID]
 			if strings.TrimSpace(unitID) == "" || unit == nil || unit.ID != unitID || (unit.TenantID != "" && unit.TenantID != snap.Tenant.ID) {
 				return &SnapshotIntegrityError{Reason: "unidad asignada al empleado no existe dentro del tenant: " + unitID}
 			}
 		}
 	}
 	return nil
 }

// RememberIdempotent registra client_op_id → serverID; recorta mapa si crece.
func RememberIdempotent(snap *StoreSnapshot, clientOpID, serverID string) {
	if snap == nil || clientOpID == "" || serverID == "" {
		return
	}
	if snap.Idempotency == nil {
		snap.Idempotency = map[string]string{}
	}
	snap.Idempotency[clientOpID] = serverID
	if len(snap.Idempotency) > IdempotencyMaxKeys {
		// borrar ~20% arbitrario (map iteration order)
		n := len(snap.Idempotency) / 5
		for k := range snap.Idempotency {
			delete(snap.Idempotency, k)
			n--
			if n <= 0 {
				break
			}
		}
	}
}

// LookupIdempotent devuelve serverID si el client_op_id ya se aplicó.
func LookupIdempotent(snap *StoreSnapshot, clientOpID string) (string, bool) {
	if snap == nil || snap.Idempotency == nil || clientOpID == "" {
		return "", false
	}
	id, ok := snap.Idempotency[clientOpID]
	return id, ok
}

// FindPOSSaleByID busca una venta POS por id de servidor.
func FindPOSSaleByID(snap *StoreSnapshot, id string) (POSSale, bool) {
	if snap == nil || id == "" {
		return POSSale{}, false
	}
	for i := range snap.POSSales {
		if snap.POSSales[i].ID == id {
			return snap.POSSales[i], true
		}
	}
	return POSSale{}, false
}

// ClientOpIDFromMeta lee client_op_id / clientOpId / idempotency_key del metadata flexible.
func ClientOpIDFromMeta(meta Metadata) string {
	if meta == nil {
		return ""
	}
	for _, k := range []string{"client_op_id", "clientOpId", "idempotency_key", "op_id"} {
		if v, ok := meta[k]; ok {
			switch t := v.(type) {
			case string:
				if s := strings.TrimSpace(t); s != "" {
					return s
				}
			}
		}
	}
	return ""
}

// SyncConflictError cuando el cliente empuja sobre una rev desactualizada.
type SyncConflictError struct {
	ServerRev int64
	RootCID   string
	Message   string
}

func (e *SyncConflictError) Error() string {
	if e.Message != "" {
		return e.Message
	}
	return fmt.Sprintf("conflicto de sincronización: servidor rev=%d", e.ServerRev)
}

// CheckSyncBase: client_rev debe ser == server (fast-forward) o force.
// Si client_rev > server → cliente “del futuro” (reloj/local corrupto) también conflicto.
func CheckSyncBase(serverRev, clientRev int64, force bool, rootCID string) error {
	if force {
		return nil
	}
	if clientRev == serverRev {
		return nil
	}
	if clientRev < serverRev {
		return &SyncConflictError{
			ServerRev: serverRev,
			RootCID:   rootCID,
			Message:   fmt.Sprintf("base desactualizada: cliente rev=%d servidor rev=%d; haga pull o force", clientRev, serverRev),
		}
	}
	return &SyncConflictError{
		ServerRev: serverRev,
		RootCID:   rootCID,
		Message:   fmt.Sprintf("rev de cliente (%d) mayor que servidor (%d)", clientRev, serverRev),
	}
}

// StampEntryServer rellena campos de servidor al aceptar un asiento offline.
func StampEntryServer(e *Entry, tenantID, userID string, now time.Time) {
	if e == nil {
		return
	}
	e.TenantID = tenantID
	if e.CreatedBy == "" {
		e.CreatedBy = userID
	}
	if e.CreatedAt.IsZero() {
		e.CreatedAt = now
	}
}
