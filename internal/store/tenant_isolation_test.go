package store

import (
	"strings"
	"path/filepath"
	"os"
	"bytes"
	"testing"

	"github.com/yecharlot/AbacoPhy/internal/domain"
)

func TestResolveTenantNeverFallsBackToUserOrSingleTenant(t *testing.T) {
	st := New(t.TempDir())
	snap := domain.BootstrapTenant("Only tenant", "only-tenant", "CUP")
	if err := st.Put(snap); err != nil { t.Fatal(err) }

	if got := st.ResolveTenant("missing-tenant", ""); got != nil {
		t.Fatal("unknown tenant ID must not resolve to the only stored tenant")
	}
	if got := st.ResolveTenant("", ""); got != nil {
		t.Fatal("empty tenant ID must not be inferred")
	}
	if got := st.ResolveTenant(snap.Tenant.ID, "unrelated-user"); got != snap {
		t.Fatal("exact tenant ID must resolve independently of userID")
	}
}


func TestFindUserByUsernameRejectsDuplicatesAcrossTenants(t *testing.T) {
	st := New(t.TempDir())
	a := domain.BootstrapTenant("A", "a", "CUP")
	b := domain.BootstrapTenant("B", "b", "CUP")
	for _, user := range a.Users { if user != nil { user.Username = "shared-login"; break } }
	for _, user := range b.Users { if user != nil { user.Username = " Shared-Login "; break } }
	if err := st.Put(a); err != nil { t.Fatal(err) }
	if err := st.Put(b); err != nil { t.Fatal(err) }
	if user, snap := st.FindUserByUsername("SHARED-LOGIN"); user != nil || snap != nil {
		t.Fatal("ambiguous username must not resolve to an arbitrary tenant")
	}
	if !st.UsernameExists(" shared-login ") {
		t.Fatal("username existence must be checked globally and normalized")
	}
}


func TestLoadCIDRejectsPathTraversal(t *testing.T) {
	st := New(t.TempDir())
	snap := domain.BootstrapTenant("Tenant A", "tenant-a", "CUP")
	if err := st.Put(snap); err != nil { t.Fatal(err) }
	if _, err := st.LoadCID("../tenants/" + snap.Tenant.ID); err == nil {
		t.Fatal("CID loader must reject path traversal")
	}
}


func TestStorePutRejectsForeignTenantChildAndBindsLegacyRecords(t *testing.T) {
	st := New(t.TempDir())
	snap := domain.BootstrapTenant("Tenant A", "tenant-a", "CUP")
	var user *domain.User
	for _, candidate := range snap.Users {
		if candidate != nil { user = candidate; break }
	}
	if user == nil { t.Fatal("bootstrap user missing") }

	originalRev := snap.Rev
	user.TenantID = "tenant-b"
	if err := st.Put(snap); err == nil {
		t.Fatal("Store.Put must reject a child explicitly assigned to another tenant")
	}
	if snap.Rev != originalRev {
		t.Fatal("rejected snapshot must not increment its revision")
	}
	if st.Get(snap.Tenant.ID) != nil {
		t.Fatal("rejected snapshot must not enter the store")
	}

	user.TenantID = ""
	if err := st.Put(snap); err != nil {
		t.Fatalf("legacy empty TenantID should be bound to snapshot tenant: %v", err)
	}
	if user.TenantID != snap.Tenant.ID {
		t.Fatal("legacy child TenantID was not normalized to the snapshot tenant")
	}
}


func TestLoadCIDVerifiesContentAddressBeforeReturningSnapshot(t *testing.T) {
	dataDir := t.TempDir()
	st := New(dataDir)
	snap := domain.BootstrapTenant("Tenant integrity", "tenant-integrity", "CUP")
	if err := st.Put(snap); err != nil {
		t.Fatal(err)
	}
	cid := snap.RootCID
	if _, err := st.LoadCID(cid); err != nil {
		t.Fatalf("fresh CID should load: %v", err)
	}

	path := filepath.Join(dataDir, "cids", cid+".json")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	tampered := bytes.Replace(raw, []byte("Tenant integrity"), []byte("Tenant tampered"), 1)
	if bytes.Equal(raw, tampered) {
		t.Fatal("test fixture did not modify the stored snapshot")
	}
	if err := os.WriteFile(path, tampered, 0600); err != nil {
		t.Fatal(err)
	}
	if _, err := st.LoadCID(cid); err == nil {
		t.Fatal("LoadCID must reject content whose bytes do not match its CID")
	}
}

func TestLoadCIDRejectsMismatchedEmbeddedRootCID(t *testing.T) {
	st := New(t.TempDir())
	snap := domain.BootstrapTenant("Tenant root", "tenant-root", "CUP")
	if err := st.Put(snap); err != nil {
		t.Fatal(err)
	}
	cid := snap.RootCID
	path := filepath.Join(st.dataDir, "cids", cid+".json")
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	tampered := bytes.Replace(raw, []byte(cid), []byte(strings.Repeat("a", len(cid))), 1)
	if bytes.Equal(raw, tampered) {
		t.Fatal("test fixture did not modify embedded root CID")
	}
	if err := os.WriteFile(path, tampered, 0600); err != nil {
		t.Fatal(err)
	}
	if _, err := st.LoadCID(cid); err == nil {
		t.Fatal("LoadCID must reject an embedded RootCID different from requested CID")
	}
}
