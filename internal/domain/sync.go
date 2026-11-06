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
