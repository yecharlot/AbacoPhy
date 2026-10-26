package domain

import "testing"

func TestPOSSaleIdempotentLookupReturnsSameServerID(t *testing.T) {
	snap := &StoreSnapshot{
		Tenant: Tenant{ID: "t1"},
		POSSales: []POSSale{
			{ID: "srv-sale-1", Number: "VT-0001", Total: 100, Metadata: Metadata{"client_op_id": "op-abc"}},
		},
	}
	RememberIdempotent(snap, "op-abc", "srv-sale-1")

	sid, ok := LookupIdempotent(snap, "op-abc")
	if !ok || sid != "srv-sale-1" {
		t.Fatalf("lookup: ok=%v sid=%q", ok, sid)
	}
	sale, found := FindPOSSaleByID(snap, sid)
	if !found || sale.Number != "VT-0001" {
		t.Fatalf("find: found=%v number=%q", found, sale.Number)
	}
}

func TestClientOpIDAliases(t *testing.T) {
	cases := []Metadata{
		{"client_op_id": "a"},
		{"clientOpId": "a"},
		{"idempotency_key": "a"},
		{"op_id": "a"},
	}
	for _, m := range cases {
		if ClientOpIDFromMeta(m) != "a" {
			t.Fatalf("meta %#v", m)
		}
	}
}

// Simula la decisión del handler: si ya hay binding, no se añade otra venta.
func TestDoubleApplyWouldNotDuplicateSale(t *testing.T) {
	snap := &StoreSnapshot{Tenant: Tenant{ID: "t1"}}
	op := "client-op-1"
	sale := POSSale{ID: "s1", Number: "VT-1", Total: 50, Metadata: Metadata{"client_op_id": op}}
	snap.POSSales = append(snap.POSSales, sale)
	RememberIdempotent(snap, op, sale.ID)

	// Segundo intento
	if sid, ok := LookupIdempotent(snap, ClientOpIDFromMeta(sale.Metadata)); ok {
		if _, found := FindPOSSaleByID(snap, sid); found {
			// no append
			if len(snap.POSSales) != 1 {
				t.Fatalf("len=%d", len(snap.POSSales))
			}
			return
		}
	}
	t.Fatal("expected idempotent short-circuit")
}
