package store

import (
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
