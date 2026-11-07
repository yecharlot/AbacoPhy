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

func TestRegistryScopesIdenticalClientIDsByTenant(t *testing.T) {
	r := NewRegistry()
	now := time.Now().UTC()
	r.Touch(Client{InstanceID: "shared-device-id", TenantID: "tenant-a", UserID: "user-a", Username: "alice", HasSession: true})
	r.Touch(Client{InstanceID: "shared-device-id", TenantID: "tenant-b", UserID: "user-b", Username: "bob", HasSession: true})

	a := r.ListOnlineForTenant("tenant-a", now)
	b := r.ListOnlineForTenant("tenant-b", now)
	if len(a) != 1 || a[0].UserID != "user-a" || a[0].Username != "alice" {
		t.Fatalf("tenant A identity was overwritten: %#v", a)
	}
	if len(b) != 1 || b[0].UserID != "user-b" || b[0].Username != "bob" {
		t.Fatalf("tenant B identity missing or mixed: %#v", b)
	}
}

func TestAnonymousClientCannotOverwriteTenantPresence(t *testing.T) {
	r := NewRegistry()
	now := time.Now().UTC()
	r.Touch(Client{InstanceID: "shared-device-id", TenantID: "tenant-a", UserID: "user-a", Username: "alice", HasSession: true})
	r.Touch(Client{InstanceID: "shared-device-id", RemoteIP: "192.0.2.10", Platform: "spoofed", HasSession: false})

	a := r.ListOnlineForTenant("tenant-a", now)
	if len(a) != 1 || a[0].UserID != "user-a" || a[0].Username != "alice" {
		t.Fatalf("anonymous client overwrote authenticated presence: %#v", a)
	}
}
