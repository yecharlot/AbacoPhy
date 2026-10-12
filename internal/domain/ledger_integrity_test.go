package domain

import (
	"testing"
	"time"
)

func TestSaleAndReceptionSameLedger(t *testing.T) {
	snap := &StoreSnapshot{
		Tenant:   Tenant{ID: "t1", Currency: "CUP"},
		Accounts: DefaultAccounts("t1"),
		Entries:  nil,
	}
	// Recepción
	if e := ApplyInventoryIn(snap, 100, "IR test", "u1"); e == nil {
		t.Fatal("inventory in nil")
	} else {
		AppendPostedEntry(snap, e, "t1", "2026-01-01")
		if !EntryBalanced(*e) {
			t.Fatalf("in not balanced %#v", e)
		}
	}
	// Venta ingreso
	if e := ApplyIncome(snap, 150, "VT test", "u1"); e == nil {
		t.Fatal("income nil")
	} else {
		AppendPostedEntry(snap, e, "t1", "2026-01-02")
	}
	// COGS
	if e := ApplyInventoryOut(snap, 40, "COGS test", "u1"); e == nil {
		t.Fatal("cogs nil")
	} else {
		AppendPostedEntry(snap, e, "t1", "2026-01-02")
	}
	// Gasto
	if e := ApplyExpense(snap, 10, "", "gasto test", "u1"); e == nil {
		t.Fatal("expense nil")
	} else {
		AppendPostedEntry(snap, e, "t1", "2026-01-03")
	}
	if len(snap.Entries) != 4 {
		t.Fatalf("entries %d", len(snap.Entries))
	}
	for _, e := range snap.Entries {
		if !EntryBalanced(e) {
			t.Fatalf("unbalanced %#v", e)
		}
	}
	li := LedgerIntegrity(snap)
	if !li["ok"].(bool) {
		t.Fatalf("integrity %#v", li)
	}
	_ = time.Now()
}
