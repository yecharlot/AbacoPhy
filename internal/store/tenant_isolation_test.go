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
