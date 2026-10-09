package domain

import (
	"testing"
	"time"
)

func kardexSnap() *StoreSnapshot {
	snap := &StoreSnapshot{
		Tenant:         Tenant{ID: "t1", Currency: "CUP"},
		Products:       map[string]*Product{},
		SalesUnits:     map[string]*SalesUnit{},
		WarehouseStock: map[string]*WarehouseStock{},
		UnitStocks:     nil,
		StockLedger:    nil,
	}
	snap.Products["p1"] = &Product{ID: "p1", Code: "P-1", Name: "A", Active: true, UpdatedAt: time.Now().UTC()}
	snap.SalesUnits["u1"] = &SalesUnit{ID: "u1", Code: "PDV", Name: "Mostrador", Active: true}
	snap.WarehouseStock["p1"] = &WarehouseStock{ProductID: "p1", Qty: 0, AvgCost: 0}
	return snap
}

func TestKardexRebuildAndReconcile(t *testing.T) {
	snap := kardexSnap()
	AppendStockMove(snap, StockMovement{
		ID: "m1", ProductID: "p1", Location: LocWarehouse, Kind: MoveReceptionIn,
		Qty: 10, QtySigned: 10, UnitCost: 2, CreatedAt: time.Now().UTC(),
	})
	snap.WarehouseStock["p1"].Qty = 10
	snap.WarehouseStock["p1"].AvgCost = 2
	snap.WarehouseStock["p1"].AmountBase = 20

	if got := RebuildQtyFromLedger(snap, LocWarehouse, "", "p1"); got != 10 {
		t.Fatalf("rebuild %v", got)
	}
	if d := ReconcileStock(snap); len(d) != 0 {
		t.Fatalf("expected no discrepancy, got %#v", d)
	}

	// Descuadre artificial
	snap.WarehouseStock["p1"].Qty = 7
	d := ReconcileStock(snap)
	if len(d) != 1 || d[0].Delta != -3 {
		t.Fatalf("discrepancy %#v", d)
	}
}

func TestStockAdjustment(t *testing.T) {
	snap := kardexSnap()
	snap.WarehouseStock["p1"].Qty = 5
	snap.WarehouseStock["p1"].AvgCost = 3
	snap.WarehouseStock["p1"].AmountBase = 15
	err := ApplyStockAdjustment(snap, LocWarehouse, "", "p1", -2, 0, "user", "merma", "adj1")
	if err != nil {
		t.Fatal(err)
	}
	if snap.WarehouseStock["p1"].Qty != 3 {
		t.Fatalf("qty %v", snap.WarehouseStock["p1"].Qty)
	}
	if len(snap.StockLedger) != 1 || snap.StockLedger[0].Kind != MoveAdjustOut {
		t.Fatalf("ledger %#v", snap.StockLedger)
	}
}
