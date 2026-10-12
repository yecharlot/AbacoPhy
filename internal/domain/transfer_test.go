package domain

import (
	"testing"
	"time"
)

func baseSnap() *StoreSnapshot {
	snap := &StoreSnapshot{
		Tenant:         Tenant{ID: "t1", Currency: "CUP"},
		Products:       map[string]*Product{},
		SalesUnits:     map[string]*SalesUnit{},
		WarehouseStock: map[string]*WarehouseStock{},
		UnitStocks:     nil,
		Inventory:      map[string]*InventoryItem{},
	}
	snap.Products["p1"] = &Product{
		ID: "p1", TenantID: "t1", Code: "P-001", Name: "Harina", Unit: "kg",
		Active: true, CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC(),
	}
	snap.Products["p2"] = &Product{
		ID: "p2", TenantID: "t1", Code: "P-002", Name: "Azúcar", Unit: "kg",
		Active: true, CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC(),
	}
	snap.Products["p-off"] = &Product{
		ID: "p-off", TenantID: "t1", Code: "P-OFF", Name: "Baja", Unit: "u",
		Active: false, CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC(),
	}
	snap.SalesUnits["u1"] = &SalesUnit{
		ID: "u1", TenantID: "t1", Code: "PDV1", Name: "Mostrador", Active: true,
		CreatedAt: time.Now().UTC(),
	}
	snap.WarehouseStock["p1"] = &WarehouseStock{ProductID: "p1", Qty: 10, AvgCost: 5, AmountBase: 50}
	snap.WarehouseStock["p2"] = &WarehouseStock{ProductID: "p2", Qty: 3, AvgCost: 2, AmountBase: 6}
	return snap
}

func TestValidateTransferStock_OK(t *testing.T) {
	snap := baseSnap()
	err := ValidateTransferStock(snap, "u1", map[string]float64{"p1": 4, "p2": 3})
	if err != nil {
		t.Fatalf("expected ok, got %v", err)
	}
}

func TestValidateTransferStock_Insufficient(t *testing.T) {
	snap := baseSnap()
	err := ValidateTransferStock(snap, "u1", map[string]float64{"p2": 5})
	if err == nil {
		t.Fatal("expected stock_insufficient")
	}
	ve, ok := err.(*TransferValidationError)
	if !ok || ve.Code != "stock_insufficient" {
		t.Fatalf("got %#v", err)
	}
	// snapshot intact
	if snap.WarehouseStock["p2"].Qty != 3 {
		t.Fatalf("stock mutated on validation: %v", snap.WarehouseStock["p2"].Qty)
	}
}

func TestValidateTransferStock_AggregateSameProduct(t *testing.T) {
	snap := baseSnap()
	demand := AggregateTransferDemand([]TransferLineInput{
		{ProductID: "p1", Qty: 6},
		{ProductID: "p1", Qty: 5}, // total 11 > 10
	})
	err := ValidateTransferStock(snap, "u1", demand)
	if err == nil {
		t.Fatal("expected insufficient on aggregated demand")
	}
}

func TestValidateTransferStock_InactiveProduct(t *testing.T) {
	snap := baseSnap()
	snap.WarehouseStock["p-off"] = &WarehouseStock{ProductID: "p-off", Qty: 100, AvgCost: 1, AmountBase: 100}
	err := ValidateTransferStock(snap, "u1", map[string]float64{"p-off": 1})
	if err == nil {
		t.Fatal("expected product_invalid")
	}
	ve := err.(*TransferValidationError)
	if ve.Code != "product_invalid" {
		t.Fatalf("code %s", ve.Code)
	}
}

func TestValidateTransferStock_BadUnit(t *testing.T) {
	snap := baseSnap()
	err := ValidateTransferStock(snap, "nope", map[string]float64{"p1": 1})
	if err == nil || err.(*TransferValidationError).Code != "unit_invalid" {
		t.Fatalf("got %v", err)
	}
}

func TestApplyTransfer_SuccessNoPartial(t *testing.T) {
	snap := baseSnap()
	lines, err := ApplyWarehouseToUnitTransfer(snap, "u1", []TransferLineInput{
		{ProductID: "p1", Qty: 4},
		{ProductID: "p2", Qty: 2},
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(lines) != 2 {
		t.Fatalf("lines %d", len(lines))
	}
	if snap.WarehouseStock["p1"].Qty != 6 {
		t.Fatalf("p1 warehouse %v", snap.WarehouseStock["p1"].Qty)
	}
	if snap.WarehouseStock["p2"].Qty != 1 {
		t.Fatalf("p2 warehouse %v", snap.WarehouseStock["p2"].Qty)
	}
	var us1 *UnitStock
	for i := range snap.UnitStocks {
		if snap.UnitStocks[i].ProductID == "p1" {
			us1 = &snap.UnitStocks[i]
		}
	}
	if us1 == nil || us1.Qty != 4 {
		t.Fatalf("unit stock p1 %#v", us1)
	}
}

func TestApplyTransfer_FailsWithoutMutating(t *testing.T) {
	snap := baseSnap()
	before1 := snap.WarehouseStock["p1"].Qty
	before2 := snap.WarehouseStock["p2"].Qty
	_, err := ApplyWarehouseToUnitTransfer(snap, "u1", []TransferLineInput{
		{ProductID: "p1", Qty: 4},
		{ProductID: "p2", Qty: 99}, // falla validación previa
	})
	if err == nil {
		t.Fatal("expected error")
	}
	if snap.WarehouseStock["p1"].Qty != before1 || snap.WarehouseStock["p2"].Qty != before2 {
		t.Fatalf("partial mutation: p1=%v p2=%v", snap.WarehouseStock["p1"].Qty, snap.WarehouseStock["p2"].Qty)
	}
	if len(snap.UnitStocks) != 0 {
		t.Fatalf("unit stocks should stay empty, got %d", len(snap.UnitStocks))
	}
}
