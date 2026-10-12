package domain

import (
	"fmt"
	"math"
	"strings"
	"time"
)

// Ubicaciones de stock en el Kardex.
const (
	LocWarehouse = "warehouse"
	LocUnit      = "unit"
)

// Tipos de movimiento (Kardex).
const (
	MoveReceptionIn = "reception_in"
	MoveTransferOut = "transfer_out"
	MoveTransferIn  = "transfer_in"
	MoveSaleOut     = "sale_out"
	MoveAdjustIn    = "adjust_in"
	MoveAdjustOut   = "adjust_out"
)

// StockMovement — asiento del libro de existencias (reconstruible).
// Qty siempre >= 0; el signo operativo es QtySigned (+ entrada, − salida).
type StockMovement struct {
	ID           string    `json:"id"`
	TenantID     string    `json:"tenant_id"`
	ProductID    string    `json:"product_id"`
	Location     string    `json:"location"` // warehouse | unit
	UnitID       string    `json:"unit_id,omitempty"`
	Kind         string    `json:"kind"`
	Qty          float64   `json:"qty"`
	QtySigned    float64   `json:"qty_signed"`
	UnitCost     float64   `json:"unit_cost,omitempty"`
	AmountBase   float64   `json:"amount_base,omitempty"`
	BalanceAfter float64   `json:"balance_after"`
	RefType      string    `json:"ref_type,omitempty"` // reception | transfer | sale | adjust
	RefID        string    `json:"ref_id,omitempty"`
	Note         string    `json:"note,omitempty"`
	CreatedBy    string    `json:"created_by"`
	CreatedAt    time.Time `json:"created_at"`
	Metadata     Metadata  `json:"metadata,omitempty"`
}

// LocationKey identifica un cubo de stock (almacén o PDV+producto).
func LocationKey(location, unitID, productID string) string {
	if location == LocUnit {
		return LocUnit + ":" + unitID + ":" + productID
	}
	return LocWarehouse + ":" + productID
}

// StoredQty devuelve la cantidad persistida en WarehouseStock / UnitStocks.
func StoredQty(snap *StoreSnapshot, location, unitID, productID string) float64 {
	if snap == nil {
		return 0
	}
	if location == LocUnit {
		for i := range snap.UnitStocks {
			if snap.UnitStocks[i].UnitID == unitID && snap.UnitStocks[i].ProductID == productID {
				return snap.UnitStocks[i].Qty
			}
		}
		return 0
	}
	if st := snap.WarehouseStock[productID]; st != nil {
		return st.Qty
	}
	return 0
}

// RebuildQtyFromLedger suma QtySigned del ledger para un cubo.
func RebuildQtyFromLedger(snap *StoreSnapshot, location, unitID, productID string) float64 {
	if snap == nil {
		return 0
	}
	var bal float64
	for _, m := range snap.StockLedger {
		if m.ProductID != productID || m.Location != location {
			continue
		}
		if location == LocUnit && m.UnitID != unitID {
			continue
		}
		bal += m.QtySigned
	}
	return bal
}

// AppendStockMove añade un movimiento y calcula BalanceAfter.
func AppendStockMove(snap *StoreSnapshot, m StockMovement) {
	if snap == nil {
		return
	}
	prev := RebuildQtyFromLedger(snap, m.Location, m.UnitID, m.ProductID)
	// Si el ledger estaba vacío pero hay stock persistido (legado), arrancar desde stored.
	if len(filterLedger(snap, m.Location, m.UnitID, m.ProductID)) == 0 {
		stored := StoredQty(snap, m.Location, m.UnitID, m.ProductID)
		// El balance previo al movimiento ya incluye el efecto actual en stock;
		// para el primer asiento usamos stored - signed para que after = stored.
		prev = stored - m.QtySigned
	}
	m.BalanceAfter = prev + m.QtySigned
	if m.Qty < 0 {
		m.Qty = -m.Qty
	}
	snap.StockLedger = append(snap.StockLedger, m)
}

func filterLedger(snap *StoreSnapshot, location, unitID, productID string) []StockMovement {
	var out []StockMovement
	for _, m := range snap.StockLedger {
		if m.ProductID != productID || m.Location != location {
			continue
		}
		if location == LocUnit && m.UnitID != unitID {
			continue
		}
		out = append(out, m)
	}
	return out
}

// KardexQuery filtra el libro (orden cronológico).
func KardexQuery(snap *StoreSnapshot, productID, location, unitID string) []StockMovement {
	if snap == nil {
		return nil
	}
	var out []StockMovement
	for _, m := range snap.StockLedger {
		if productID != "" && m.ProductID != productID {
			continue
		}
		if location != "" && m.Location != location {
			continue
		}
		if unitID != "" && m.UnitID != unitID {
			continue
		}
		out = append(out, m)
	}
	return out
}

// StockDiscrepancy descuadre entre stock almacenado y reconstrucción por movimientos.
type StockDiscrepancy struct {
	ProductID   string  `json:"product_id"`
	ProductCode string  `json:"product_code,omitempty"`
	ProductName string  `json:"product_name,omitempty"`
	Location    string  `json:"location"`
	UnitID      string  `json:"unit_id,omitempty"`
	StoredQty   float64 `json:"stored_qty"`
	LedgerQty   float64 `json:"ledger_qty"`
	Delta       float64 `json:"delta"`
}

const qtyEps = 1e-6

// ReconcileStock compara cubos con al menos un movimiento o stock ≠ 0.
func ReconcileStock(snap *StoreSnapshot) []StockDiscrepancy {
	if snap == nil {
		return nil
	}
	seen := map[string]struct{}{}
	var list []StockDiscrepancy

	add := func(location, unitID, productID string) {
		key := LocationKey(location, unitID, productID)
		if _, ok := seen[key]; ok {
			return
		}
		seen[key] = struct{}{}
		stored := StoredQty(snap, location, unitID, productID)
		ledger := RebuildQtyFromLedger(snap, location, unitID, productID)
		// Sin movimientos y stock 0 → ignorar
		if math.Abs(stored) < qtyEps && math.Abs(ledger) < qtyEps && len(filterLedger(snap, location, unitID, productID)) == 0 {
			return
		}
		delta := stored - ledger
		if math.Abs(delta) < qtyEps {
			return
		}
		code, name := productID, ""
		if p := snap.Products[productID]; p != nil {
			code, name = p.Code, p.Name
		}
		list = append(list, StockDiscrepancy{
			ProductID: productID, ProductCode: code, ProductName: name,
			Location: location, UnitID: unitID,
			StoredQty: stored, LedgerQty: ledger, Delta: delta,
		})
	}

	for pid := range snap.WarehouseStock {
		add(LocWarehouse, "", pid)
	}
	for i := range snap.UnitStocks {
		us := snap.UnitStocks[i]
		add(LocUnit, us.UnitID, us.ProductID)
	}
	for _, m := range snap.StockLedger {
		add(m.Location, m.UnitID, m.ProductID)
	}
	return list
}

// ApplyStockAdjustment aplica un ajuste formal sobre almacén o PDV y registra Kardex.
// deltaQty > 0 aumenta stock; < 0 disminuye. unitCost opcional (si 0 usa avg actual).
func ApplyStockAdjustment(snap *StoreSnapshot, location, unitID, productID string, deltaQty, unitCost float64, userID, note, moveID string) error {
	if snap == nil {
		return fmt.Errorf("snapshot nulo")
	}
	p := snap.Products[productID]
	if p == nil || !p.Active {
		return fmt.Errorf("producto no válido")
	}
	if deltaQty == 0 {
		return fmt.Errorf("cantidad de ajuste no puede ser cero")
	}
	now := time.Now().UTC()
	kind := MoveAdjustIn
	if deltaQty < 0 {
		kind = MoveAdjustOut
	}
	qty := math.Abs(deltaQty)

	switch location {
	case LocWarehouse:
		st := snap.WarehouseStock[productID]
		if st == nil {
			st = &WarehouseStock{ProductID: productID}
			snap.WarehouseStock[productID] = st
		}
		if deltaQty < 0 && st.Qty+1e-9 < qty {
			return fmt.Errorf("stock insuficiente en almacén para ajuste")
		}
		cost := unitCost
		if cost <= 0 {
			cost = st.AvgCost
		}
		if deltaQty > 0 {
			nq := st.Qty + qty
			if nq > 0 {
				st.AvgCost = (st.AmountBase + qty*cost) / nq
			}
			st.Qty = nq
		} else {
			st.Qty -= qty
			st.AmountBase = st.Qty * st.AvgCost
			cost = st.AvgCost
		}
		st.AmountBase = st.Qty * st.AvgCost
		AppendStockMove(snap, StockMovement{
			ID: moveID, TenantID: snap.Tenant.ID, ProductID: productID,
			Location: LocWarehouse, Kind: kind, Qty: qty, QtySigned: deltaQty,
			UnitCost: cost, AmountBase: qty * cost,
			RefType: "adjust", RefID: moveID, Note: note,
			CreatedBy: userID, CreatedAt: now,
		})
	case LocUnit:
		if strings.TrimSpace(unitID) == "" {
			return fmt.Errorf("unit_id requerido para ajuste en PDV")
		}
		if snap.SalesUnits[unitID] == nil {
			return fmt.Errorf("punto de venta no válido")
		}
		var us *UnitStock
		for i := range snap.UnitStocks {
			if snap.UnitStocks[i].UnitID == unitID && snap.UnitStocks[i].ProductID == productID {
				us = &snap.UnitStocks[i]
				break
			}
		}
		if us == nil {
			if deltaQty < 0 {
				return fmt.Errorf("sin stock en PDV para ajustar a la baja")
			}
			snap.UnitStocks = append(snap.UnitStocks, UnitStock{
				UnitID: unitID, ProductID: productID, Qty: 0, AvgCost: unitCost,
			})
			us = &snap.UnitStocks[len(snap.UnitStocks)-1]
		}
		if deltaQty < 0 && us.Qty+1e-9 < qty {
			return fmt.Errorf("stock insuficiente en PDV para ajuste")
		}
		cost := unitCost
		if cost <= 0 {
			cost = us.AvgCost
		}
		if deltaQty > 0 {
			nq := us.Qty + qty
			if nq > 0 {
				us.AvgCost = (us.AmountBase + qty*cost) / nq
			}
			us.Qty = nq
		} else {
			us.Qty -= qty
		}
		us.AmountBase = us.Qty * us.AvgCost
		AppendStockMove(snap, StockMovement{
			ID: moveID, TenantID: snap.Tenant.ID, ProductID: productID,
			Location: LocUnit, UnitID: unitID, Kind: kind, Qty: qty, QtySigned: deltaQty,
			UnitCost: cost, AmountBase: qty * cost,
			RefType: "adjust", RefID: moveID, Note: note,
			CreatedBy: userID, CreatedAt: now,
		})
	default:
		return fmt.Errorf("ubicación inválida (warehouse|unit)")
	}
	return nil
}
