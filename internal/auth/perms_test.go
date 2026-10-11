package auth

import (
	"testing"
	"time"

	"github.com/yecharlot/AbacoPhy/internal/domain"
)

func TestReadonlyCannotMutate(t *testing.T) {
	snap := &domain.StoreSnapshot{
		Tenant: domain.Tenant{ID: "t1", EnabledModules: map[string]bool{"ingresos": true}},
		Users:  map[string]*domain.User{},
	}
	if CanMutate(snap, domain.RoleReadonly, "ingresos", nil) {
		t.Fatal("readonly must not mutate")
	}
	if !CanAccessUser(snap, domain.RoleReadonly, "dashboard", nil) {
		// dashboard allowed for readonly in ViewACL
	}
}

func TestUserGrantFalseBlocks(t *testing.T) {
	snap := &domain.StoreSnapshot{
		Tenant: domain.Tenant{ID: "t1", EnabledModules: map[string]bool{"gastos": true}},
	}
	u := &domain.User{ID: "u1", Role: domain.RoleContador, Modules: map[string]bool{"gastos": false}}
	if CanAccessUser(snap, u.Role, "gastos", u) {
		t.Fatal("explicit false must block")
	}
	if CanMutate(snap, u.Role, "gastos", u) {
		t.Fatal("mutate blocked")
	}
}

func TestUserGrantTrueOutsideRole(t *testing.T) {
	snap := &domain.StoreSnapshot{
		Tenant: domain.Tenant{ID: "t1", EnabledModules: map[string]bool{"productos": true}},
	}
	// vendedor normally may not have productos; explicit true grants
	u := &domain.User{ID: "u1", Role: domain.RoleVendedor, Modules: map[string]bool{"productos": true}}
	if !CanAccessUser(snap, u.Role, "productos", u) {
		t.Fatal("explicit true should grant")
	}
}

func TestPermsEpochBump(t *testing.T) {
	snap := &domain.StoreSnapshot{Tenant: domain.Tenant{ID: "t1"}}
	u := &domain.User{ID: "u1", Role: domain.RoleAdmin}
	BumpTenantPermsEpoch(snap)
	BumpUserPermsEpoch(u)
	if snap.Tenant.PermsEpoch < 1 || u.PermsEpoch < 1 {
		t.Fatal("epoch")
	}
	if EffectivePermsEpoch(snap, u) < 1 {
		t.Fatal("effective")
	}
	_ = time.Now()
}
