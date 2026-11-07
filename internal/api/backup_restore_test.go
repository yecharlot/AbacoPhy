package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/yecharlot/AbacoPhy/internal/auth"
	"github.com/yecharlot/AbacoPhy/internal/domain"
	"github.com/yecharlot/AbacoPhy/internal/store"
)

func backupRestoreTestFixture(t *testing.T) (*store.Store, http.Handler, string, *domain.StoreSnapshot) {
	t.Helper()
	st := store.New(t.TempDir())
	snap := domain.BootstrapTenant("Restore tenant", "restore-tenant", "CUP")
	master := userByName(snap, "master")
	if master == nil { t.Fatal("master user missing") }
	master.MustChangePassword = false
	master.PasswordHash = mustHashForTenantIsolationTest(t, "restore-test-master-password")
	if err := st.Put(snap); err != nil { t.Fatal(err) }
	sess, _, err := auth.Login(st, master.Username, "restore-test-master-password")
	if err != nil { t.Fatal(err) }
	return st, NewServer(st, t.TempDir()).Handler(), sess.Token, snap
}

func restoreRequest(t *testing.T, handler http.Handler, token, cid string) *httptest.ResponseRecorder {
	t.Helper()
	body, err := json.Marshal(map[string]string{"cid": cid})
	if err != nil { t.Fatal(err) }
	req := httptest.NewRequest(http.MethodPost, "/api/v1/backups/restore", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	return rec
}

func TestBackupRestoreRejectsCorruptCIDWithoutChangingTenant(t *testing.T) {
	st, handler, token, snap := backupRestoreTestFixture(t)
	snap.Tenant.Name = "Historical state"
	if err := st.Put(snap); err != nil { t.Fatal(err) }
	historicalCID := snap.RootCID

	current := st.Get(snap.Tenant.ID)
	current.Tenant.Name = "Current state"
	if err := st.Put(current); err != nil { t.Fatal(err) }
	beforeCID, beforeRev, beforeName := current.RootCID, current.Rev, current.Tenant.Name

	cidPath := filepath.Join(st.DataDir(), "cids", historicalCID+".json")
	raw, err := os.ReadFile(cidPath)
	if err != nil { t.Fatal(err) }
	raw = bytes.Replace(raw, []byte("Historical state"), []byte("Tampered state"), 1)
	if err := os.WriteFile(cidPath, raw, 0644); err != nil { t.Fatal(err) }

	rec := restoreRequest(t, handler, token, historicalCID)
	if rec.Code != http.StatusNotFound { t.Fatalf("corrupt CID restore status=%d body=%s", rec.Code, rec.Body.String()) }
	after := st.Get(snap.Tenant.ID)
	if after.RootCID != beforeCID || after.Rev != beforeRev || after.Tenant.Name != beforeName {
		t.Fatalf("tenant changed after rejected corrupt restore: cid=%q rev=%d name=%q", after.RootCID, after.Rev, after.Tenant.Name)
	}
}

func TestBackupRestorePreservesCurrentBackupAndAuditHistory(t *testing.T) {
	st, handler, token, snap := backupRestoreTestFixture(t)
	snap.Tenant.Name = "Historical tenant name"
	if err := st.Put(snap); err != nil { t.Fatal(err) }
	historicalCID := snap.RootCID

	current := st.Get(snap.Tenant.ID)
	current.Tenant.Name = "Current tenant name"
	current.Backups = []domain.BackupMeta{{CID: "existing-backup-cid", Label: "Existing backup"}}
	current.AuditLog = []domain.AuditEntry{{ID: "audit-before-restore", TenantID: snap.Tenant.ID, Action: "before.restore", Detail: "must survive"}}
	if err := st.Put(current); err != nil { t.Fatal(err) }

	rec := restoreRequest(t, handler, token, historicalCID)
	if rec.Code != http.StatusOK { t.Fatalf("valid restore status=%d body=%s", rec.Code, rec.Body.String()) }
	restored := st.Get(snap.Tenant.ID)
	if restored.Tenant.Name != "Historical tenant name" { t.Fatalf("historical state not restored: %q", restored.Tenant.Name) }
	if len(restored.Backups) != 1 || restored.Backups[0].CID != "existing-backup-cid" {
		t.Fatalf("backup history not preserved: %#v", restored.Backups)
	}
	foundPrior, foundRestore := false, false
	for _, entry := range restored.AuditLog {
		if entry.ID == "audit-before-restore" && entry.TenantID == snap.Tenant.ID { foundPrior = true }
		if entry.Action == "backup.restore" && entry.TenantID == snap.Tenant.ID && entry.Ref == historicalCID { foundRestore = true }
	}
	if !foundPrior || !foundRestore { t.Fatalf("audit history incomplete: prior=%v restore=%v log=%#v", foundPrior, foundRestore, restored.AuditLog) }
}

func TestBackupRestorePersistenceFailureDoesNotReplaceInMemoryTenant(t *testing.T) {
	st, handler, token, snap := backupRestoreTestFixture(t)
	snap.Tenant.Name = "Historical tenant name"
	if err := st.Put(snap); err != nil { t.Fatal(err) }
	historicalCID := snap.RootCID

	current := st.Get(snap.Tenant.ID)
	current.Tenant.Name = "Current tenant name"
	if err := st.Put(current); err != nil { t.Fatal(err) }
	beforeCID, beforeRev := current.RootCID, current.Rev

	tenantPath := filepath.Join(st.DataDir(), "tenants", snap.Tenant.ID+".json")
	if err := os.Remove(tenantPath); err != nil { t.Fatal(err) }
	if err := os.Mkdir(tenantPath, 0700); err != nil { t.Fatal(err) }

	rec := restoreRequest(t, handler, token, historicalCID)
	if rec.Code != http.StatusInternalServerError { t.Fatalf("restore persistence failure status=%d body=%s", rec.Code, rec.Body.String()) }
	after := st.Get(snap.Tenant.ID)
	if after.RootCID != beforeCID || after.Rev != beforeRev || after.Tenant.Name != "Current tenant name" {
		t.Fatalf("failed restore replaced in-memory tenant: cid=%q rev=%d name=%q", after.RootCID, after.Rev, after.Tenant.Name)
	}
}
