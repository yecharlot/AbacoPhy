package presence

import (
	"testing"
	"time"
)

func TestListOnlineForTenantDoesNotExposeOtherTenantClients(t *testing.T) {
	r := NewRegistry()
	now := time.Now().UTC()
	r.Touch(Client{InstanceID: "device-a", TenantID: "tenant-a", UserID: "user-a", Username: "alice", HasSession: true, LastSeen: now})
	r.Touch(Client{InstanceID: "device-b", TenantID: "tenant-b", UserID: "user-b", Username: "bob", HasSession: true, LastSeen: now})

	a := r.ListOnlineForTenant("tenant-a", now)
	if len(a) != 1 || a[0].InstanceID != "device-a" {
		t.Fatalf("tenant A presence = %#v, want only device-a", a)
	}
	b := r.ListOnlineForTenant("tenant-b", now)
	if len(b) != 1 || b[0].InstanceID != "device-b" {
		t.Fatalf("tenant B presence = %#v, want only device-b", b)
	}
	if got := r.ListOnlineForTenant("", now); len(got) != 0 {
		t.Fatalf("empty tenant must not list global presence: %#v", got)
	}
}
