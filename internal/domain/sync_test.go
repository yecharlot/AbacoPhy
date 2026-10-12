package domain

import "testing"

func TestCheckSyncBase(t *testing.T) {
	if err := CheckSyncBase(10, 10, false, "c"); err != nil {
		t.Fatal(err)
	}
	if err := CheckSyncBase(10, 9, false, "c"); err == nil {
		t.Fatal("expected conflict")
	}
	if err := CheckSyncBase(10, 9, true, "c"); err != nil {
		t.Fatal("force should pass")
	}
}

func TestIdempotentRoundtrip(t *testing.T) {
	snap := &StoreSnapshot{Tenant: Tenant{ID: "t1"}}
	RememberIdempotent(snap, "op1", "srv1")
	id, ok := LookupIdempotent(snap, "op1")
	if !ok || id != "srv1" {
		t.Fatalf("%v %v", id, ok)
	}
}

func TestValidateSnapshotStructure(t *testing.T) {
	if err := ValidateSnapshotStructure(&StoreSnapshot{}); err == nil {
		t.Fatal("empty tenant should fail")
	}
	s := &StoreSnapshot{Tenant: Tenant{ID: "t1"}}
	if err := ValidateSnapshotStructure(s); err != nil {
		t.Fatal(err)
	}
	if s.Users == nil || s.Idempotency == nil {
		t.Fatal("maps init")
	}
}

func TestClientOpIDFromMeta(t *testing.T) {
	if ClientOpIDFromMeta(Metadata{"client_op_id": "abc"}) != "abc" {
		t.Fatal()
	}
}
