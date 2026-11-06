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


func TestBindSnapshotToTenantRejectsForeignChild(t *testing.T) {
	s := &StoreSnapshot{
		Tenant: Tenant{ID: "tenant-a"},
		Users: map[string]*User{"u1": {ID: "u1", TenantID: "tenant-a"}},
		Accounts: map[string]*Account{"a1": {ID: "a1", TenantID: "tenant-b"}},
	}
	if err := BindSnapshotToTenant(s, "tenant-a"); err == nil {
		t.Fatal("snapshot with a child from another tenant must be rejected")
	}
}

func TestBindSnapshotToTenantNormalizesLegacyEmptyTenantIDs(t *testing.T) {
	s := &StoreSnapshot{
		Tenant: Tenant{ID: "tenant-a"},
		Users: map[string]*User{"u1": {ID: "u1"}},
		Accounts: map[string]*Account{"a1": {ID: "a1"}},
		Entries: []Entry{{ID: "e1"}},
		MeasureUnits: map[string]*MeasureUnit{"unit": {ID: "unit"}},
		PriceSheets: map[string]*PriceSheet{"price": {ID: "price"}},
		OnlineOrders: []OnlineOrder{{ID: "order"}},
	}
	if err := BindSnapshotToTenant(s, "tenant-a"); err != nil { t.Fatal(err) }
	if s.Users["u1"].TenantID != "tenant-a" || s.Accounts["a1"].TenantID != "tenant-a" || s.Entries[0].TenantID != "tenant-a" ||
		s.MeasureUnits["unit"].TenantID != "tenant-a" || s.PriceSheets["price"].TenantID != "tenant-a" || s.OnlineOrders[0].TenantID != "tenant-a" {
		t.Fatal("legacy records must be bound to the destination tenant")
	}
}


func TestBindSnapshotToTenantChecksAllTenantScopedModules(t *testing.T) {
	s := &StoreSnapshot{
		Tenant: Tenant{ID: "tenant-a"},
		MeasureUnits: map[string]*MeasureUnit{"unit": {ID: "unit", TenantID: "tenant-a"}},
		PriceSheets: map[string]*PriceSheet{"price": {ID: "price", TenantID: "tenant-b"}},
		OnlineOrders: []OnlineOrder{{ID: "order", TenantID: "tenant-a"}},
	}
	if err := BindSnapshotToTenant(s, "tenant-a"); err == nil {
		t.Fatal("foreign price sheet must be rejected during backup binding")
	}
}



func TestValidateSnapshotReferencesRejectsNonCanonicalIDsAndMissingOperationalRefs(t *testing.T) {
	t.Run("map key mismatch", func(t *testing.T) {
		s := &StoreSnapshot{Tenant: Tenant{ID: "tenant-a"}, Products: map[string]*Product{"key-a": {ID: "product-b", TenantID: "tenant-a"}}}
		if err := ValidateSnapshotReferences(s); err == nil { t.Fatal("map key and entity ID mismatch must be rejected") }
	})
	t.Run("missing counterpart", func(t *testing.T) {
		s := &StoreSnapshot{Tenant: Tenant{ID: "tenant-a"}, Accounts: map[string]*Account{"account-a": {ID: "account-a"}}, Entries: []Entry{{ID: "entry-a", Counterpart: "account-from-b"}}}
		if err := ValidateSnapshotReferences(s); err == nil { t.Fatal("counterpart must resolve inside the same snapshot") }
	})
	t.Run("warehouse stock without local product", func(t *testing.T) {
		s := &StoreSnapshot{Tenant: Tenant{ID: "tenant-a"}, WarehouseStock: map[string]*WarehouseStock{"product-from-b": {ProductID: "product-from-b"}}}
		if err := ValidateSnapshotReferences(s); err == nil { t.Fatal("warehouse stock must reference a product in the same snapshot") }
	})
}

func TestValidateSnapshotReferencesRejectsForeignEmployeeAssignments(t *testing.T) {
	s := &StoreSnapshot{
		Tenant: Tenant{ID: "tenant-a"},
		Users: map[string]*User{"user-a": {ID: "user-a", TenantID: "tenant-a"}},
		SalesUnits: map[string]*SalesUnit{"unit-a": {ID: "unit-a", TenantID: "tenant-a"}},
		Employees: map[string]*Employee{
			"employee-a": {ID: "employee-a", TenantID: "tenant-a", Metadata: Metadata{
				"userId": "user-from-b", "unitIds": []any{"unit-a"},
			}},
		},
	}
	if err := ValidateSnapshotReferences(s); err == nil {
		t.Fatal("employee assignment to a user outside this tenant must be rejected")
	}
	s.Employees["employee-a"].Metadata["userId"] = "user-a"
	s.Employees["employee-a"].Metadata["unitIds"] = []any{"unit-from-b"}
	if err := ValidateSnapshotReferences(s); err == nil {
		t.Fatal("employee assignment to a sales unit outside this tenant must be rejected")
	}
}

func TestValidateSnapshotReferencesAcceptsLocalEmployeeAssignments(t *testing.T) {
	s := &StoreSnapshot{
		Tenant: Tenant{ID: "tenant-a"},
		Users: map[string]*User{"user-a": {ID: "user-a", TenantID: "tenant-a"}},
		SalesUnits: map[string]*SalesUnit{"unit-a": {ID: "unit-a", TenantID: "tenant-a"}},
		Employees: map[string]*Employee{
			"employee-a": {ID: "employee-a", TenantID: "tenant-a", Metadata: Metadata{
				"userId": "user-a", "unitIds": []any{"unit-a"},
			}},
		},
	}
	if err := ValidateSnapshotReferences(s); err != nil {
		t.Fatalf("local employee assignments should validate: %v", err)
	}
}
