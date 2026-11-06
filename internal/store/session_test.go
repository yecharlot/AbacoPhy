package store

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/yecharlot/AbacoPhy/internal/domain"
)

func TestTokenPersistenceUsesRestrictedPermissions(t *testing.T) {
	dir := t.TempDir()
	st := New(dir)
	session := &domain.TokenSession{
		Token: "test-token", UserID: "user-1", TenantID: "tenant-1",
		Role: domain.RoleVendedor, ExpiresAt: time.Now().UTC().Add(time.Hour),
	}
	st.SaveToken(session)

	path := filepath.Join(dir, "tokens.json")
	info, err := os.Stat(path)
	if err != nil {
		t.Fatal(err)
	}
	if os.Getenv("GOOS") != "windows" && info.Mode().Perm() != 0600 {
		t.Fatalf("tokens.json permissions = %04o, want 0600", info.Mode().Perm())
	}

	reloaded := New(dir)
	if got := reloaded.GetToken(session.Token); got == nil || got.UserID != session.UserID {
		t.Fatal("valid session must survive a store restart")
	}
}

func TestExpiredTokensAreRemovedFromMemoryAndDisk(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "tokens.json")
	expired := map[string]*domain.TokenSession{
		"expired": {
			Token: "expired", UserID: "user-1", TenantID: "tenant-1",
			ExpiresAt: time.Now().UTC().Add(-time.Minute),
		},
		"valid": {
			Token: "valid", UserID: "user-2", TenantID: "tenant-1",
			ExpiresAt: time.Now().UTC().Add(time.Hour),
		},
	}
	raw, err := json.Marshal(expired)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, raw, 0600); err != nil {
		t.Fatal(err)
	}

	st := New(dir)
	if st.GetToken("expired") != nil {
		t.Fatal("expired session must not load")
	}
	if st.GetToken("valid") == nil {
		t.Fatal("valid session must load")
	}

	persisted, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	var got map[string]*domain.TokenSession
	if err := json.Unmarshal(persisted, &got); err != nil {
		t.Fatal(err)
	}
	if _, exists := got["expired"]; exists {
		t.Fatal("expired session must be pruned from tokens.json during startup")
	}
	if _, exists := got["valid"]; !exists {
		t.Fatal("valid session must remain persisted")
	}
}

func TestRevokeUserTokensRemovesAllSessions(t *testing.T) {
	st := New(t.TempDir())
	future := time.Now().UTC().Add(time.Hour)
	st.SaveToken(&domain.TokenSession{Token: "u1-a", UserID: "u1", TenantID: "t1", ExpiresAt: future})
	st.SaveToken(&domain.TokenSession{Token: "u1-b", UserID: "u1", TenantID: "t1", ExpiresAt: future})
	st.SaveToken(&domain.TokenSession{Token: "u2-a", UserID: "u2", TenantID: "t1", ExpiresAt: future})

	if revoked := st.RevokeUserTokens("u1"); revoked != 2 {
		t.Fatalf("revoked sessions = %d, want 2", revoked)
	}
	if st.GetToken("u1-a") != nil || st.GetToken("u1-b") != nil {
		t.Fatal("all sessions for user u1 must be revoked")
	}
	if st.GetToken("u2-a") == nil {
		t.Fatal("sessions for other users must remain valid")
	}
}
