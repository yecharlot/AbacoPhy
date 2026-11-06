package auth

import (
	"testing"
	"time"

	"github.com/yecharlot/AbacoPhy/internal/domain"
	"github.com/yecharlot/AbacoPhy/internal/store"
)

func TestSessionLifetimeByRole(t *testing.T) {
	tests := []struct {
		role string
		want time.Duration
	}{
		{role: domain.RoleAdmin, want: 4 * time.Hour},
		{role: domain.RoleMaster, want: 4 * time.Hour},
		{role: domain.RoleContador, want: 12 * time.Hour},
		{role: domain.RoleEconomico, want: 12 * time.Hour},
		{role: domain.RoleVendedor, want: 12 * time.Hour},
		{role: domain.RoleReadonly, want: 12 * time.Hour},
	}
	for _, tt := range tests {
		t.Run(tt.role, func(t *testing.T) {
			if got := SessionLifetime(tt.role); got != tt.want {
				t.Fatalf("SessionLifetime(%q) = %s, want %s", tt.role, got, tt.want)
			}
		})
	}
}

func TestLoginAppliesRoleBasedAbsoluteExpiry(t *testing.T) {
	st := store.New(t.TempDir())
	snap := domain.BootstrapTenant("Session test", "session-test", "CUP")
	master := snap.Users["master"]
	if master == nil {
		for _, user := range snap.Users {
			if user != nil && user.Role == domain.RoleMaster {
				master = user
				break
			}
		}
	}
	if master == nil {
		t.Fatal("bootstrap master user not found")
	}
	master.PasswordHash, _ = HashPassword("master-session-passphrase")
	master.Active = true

	regular := &domain.User{
		ID: "regular-session-user", TenantID: snap.Tenant.ID,
		Username: "regular-session-user", Role: domain.RoleVendedor,
		PasswordHash: mustHashForSessionTest(t, "regular-session-passphrase"),
		Active: true,
	}
	snap.Users[regular.ID] = regular
	if err := st.Put(snap); err != nil {
		t.Fatal(err)
	}

	before := time.Now().UTC()
	adminSession, _, err := Login(st, master.Username, "master-session-passphrase")
	if err != nil {
		t.Fatalf("admin login: %v", err)
	}
	regularSession, _, err := Login(st, regular.Username, "regular-session-passphrase")
	if err != nil {
		t.Fatalf("regular login: %v", err)
	}
	if adminSession.ExpiresAt.Before(before.Add(4*time.Hour)) || adminSession.ExpiresAt.After(time.Now().UTC().Add(4*time.Hour+time.Minute)) {
		t.Fatalf("admin expiry = %s, expected approximately 4 hours", adminSession.ExpiresAt)
	}
	if regularSession.ExpiresAt.Before(before.Add(12*time.Hour)) || regularSession.ExpiresAt.After(time.Now().UTC().Add(12*time.Hour+time.Minute)) {
		t.Fatalf("regular expiry = %s, expected approximately 12 hours", regularSession.ExpiresAt)
	}
}

func TestSessionFromRequestRejectsExpiredToken(t *testing.T) {
	st := store.New(t.TempDir())
	snap := domain.BootstrapTenant("Expired session", "expired-session", "CUP")
	user := snap.Users["admin"]
	if user == nil {
		for _, candidate := range snap.Users {
			if candidate != nil && candidate.Role == domain.RoleAdmin {
				user = candidate
				break
			}
		}
	}
	if user == nil {
		t.Fatal("bootstrap admin user not found")
	}
	user.PasswordHash = mustHashForSessionTest(t, "admin-expired-session-passphrase")
	user.Active = true
	if err := st.Put(snap); err != nil {
		t.Fatal(err)
	}
	sess, _, err := Login(st, user.Username, "admin-expired-session-passphrase")
	if err != nil {
		t.Fatal(err)
	}
	sess.ExpiresAt = time.Now().UTC().Add(-time.Minute)
	st.SaveToken(sess)
	if _, err := SessionFromRequest(st, "Bearer "+sess.Token); err == nil {
		t.Fatal("expired session must be rejected")
	}
}

func mustHashForSessionTest(t *testing.T, password string) string {
	t.Helper()
	hash, err := HashPassword(password)
	if err != nil {
		t.Fatal(err)
	}
	return hash
}

func TestSessionFromRequestRejectsExpiredAndRevokedSessions(t *testing.T) {
	st := store.New(t.TempDir())
	snap := domain.BootstrapTenant("Session validation", "session-validation", "CUP")
	user := snap.Users["admin"]
	if user == nil {
		for _, candidate := range snap.Users {
			if candidate != nil && candidate.Role == domain.RoleAdmin {
				user = candidate
				break
			}
		}
	}
	if user == nil {
		t.Fatal("bootstrap admin user not found")
	}
	user.PasswordHash = mustHashForSessionTest(t, "admin-session-passphrase")
	user.Active = true
	if err := st.Put(snap); err != nil {
		t.Fatal(err)
	}

	sess, _, err := Login(st, user.Username, "admin-session-passphrase")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := SessionFromRequest(st, "Bearer "+sess.Token); err != nil {
		t.Fatalf("fresh session rejected: %v", err)
	}

	BumpUserPermsEpoch(user)
	if _, err := SessionFromRequest(st, "Bearer "+sess.Token); err == nil {
		t.Fatal("session must be rejected after user permissions epoch changes")
	}

	sess, _, err = Login(st, user.Username, "admin-session-passphrase")
	if err != nil {
		t.Fatal(err)
	}
	user.Active = false
	if _, err := SessionFromRequest(st, "Bearer "+sess.Token); err == nil {
		t.Fatal("session must be rejected after user is deactivated")
	}
}


func TestLoginRejectsUserAssignedToDifferentTenant(t *testing.T) {
	st := store.New(t.TempDir())
	snap := domain.BootstrapTenant("Tenant binding", "tenant-binding", "CUP")
	user := snap.Users["admin"]
	if user == nil {
		for _, candidate := range snap.Users {
			if candidate != nil && candidate.Role == domain.RoleAdmin { user = candidate; break }
		}
	}
	if user == nil { t.Fatal("bootstrap admin user not found") }
	user.PasswordHash = mustHashForSessionTest(t, "tenant-binding-password")
	user.TenantID = "different-tenant"
	if err := st.Put(snap); err != nil { t.Fatal(err) }
	if _, _, err := Login(st, user.Username, "tenant-binding-password"); err == nil {
		t.Fatal("login must reject a user whose TenantID differs from its snapshot")
	}
}

func TestSessionFromRequestRejectsCrossTenantUserBinding(t *testing.T) {
	st := store.New(t.TempDir())
	snap := domain.BootstrapTenant("Tenant binding", "tenant-binding", "CUP")
	user := snap.Users["admin"]
	if user == nil {
		for _, candidate := range snap.Users {
			if candidate != nil && candidate.Role == domain.RoleAdmin { user = candidate; break }
		}
	}
	if user == nil { t.Fatal("bootstrap admin user not found") }
	user.TenantID = "other-tenant"
	if err := st.Put(snap); err != nil { t.Fatal(err) }
	sess := &domain.TokenSession{
		Token: "cross-tenant-session", UserID: user.ID, TenantID: snap.Tenant.ID,
		Role: user.Role, ExpiresAt: time.Now().UTC().Add(time.Hour),
	}
	st.SaveToken(sess)
	if _, err := SessionFromRequest(st, "Bearer "+sess.Token); err == nil {
		t.Fatal("session must be rejected when its user belongs to a different tenant")
	}
	if st.GetToken(sess.Token) != nil {
		t.Fatal("invalid cross-tenant session must be revoked")
	}
}


func TestLoginDisambiguatesLegacyDuplicateUsernamesByPassword(t *testing.T) {
	st := store.New(t.TempDir())
	a := domain.BootstrapTenant("Tenant A", "tenant-a", "CUP")
	b := domain.BootstrapTenant("Tenant B", "tenant-b", "CUP")
	passwordA, err := HashPassword("tenant-a-unique-password")
	if err != nil { t.Fatal(err) }
	passwordB, err := HashPassword("tenant-b-unique-password")
	if err != nil { t.Fatal(err) }
	userA := &domain.User{ID: "user-a", TenantID: a.Tenant.ID, Username: "legacy-shared", Role: domain.RoleVendedor, PasswordHash: passwordA, Active: true}
	userB := &domain.User{ID: "user-b", TenantID: b.Tenant.ID, Username: "legacy-shared", Role: domain.RoleVendedor, PasswordHash: passwordB, Active: true}
	a.Users[userA.ID] = userA
	b.Users[userB.ID] = userB
	if err := st.Put(a); err != nil { t.Fatal(err) }
	if err := st.Put(b); err != nil { t.Fatal(err) }

	sessA, gotA, err := Login(st, "legacy-shared", "tenant-a-unique-password")
	if err != nil { t.Fatal(err) }
	if gotA.ID != userA.ID || sessA.TenantID != a.Tenant.ID { t.Fatal("tenant A credentials resolved to the wrong tenant") }
	sessB, gotB, err := Login(st, "legacy-shared", "tenant-b-unique-password")
	if err != nil { t.Fatal(err) }
	if gotB.ID != userB.ID || sessB.TenantID != b.Tenant.ID { t.Fatal("tenant B credentials resolved to the wrong tenant") }

	sameHash, err := HashPassword("same-password-for-both")
	if err != nil { t.Fatal(err) }
	userA.PasswordHash, userB.PasswordHash = sameHash, sameHash
	if err := st.Put(a); err != nil { t.Fatal(err) }
	if err := st.Put(b); err != nil { t.Fatal(err) }
	if _, _, err := Login(st, "legacy-shared", "same-password-for-both"); err == nil {
		t.Fatal("identical credentials across tenants must remain ambiguous and be rejected")
	}
}
