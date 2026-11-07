package api

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/yecharlot/AbacoPhy/internal/auth"
	"github.com/yecharlot/AbacoPhy/internal/domain"
	"github.com/yecharlot/AbacoPhy/internal/store"
)

func backupImportTestHandler(t *testing.T) (http.Handler, *store.Store, string) {
	t.Helper()
	st := store.New(t.TempDir())
	snap := domain.BootstrapTenant("Backup test", "backup-test", "CUP")
	admin := userByName(snap, "admin")
	if admin == nil {
		t.Fatal("admin user missing")
	}
	admin.MustChangePassword = false
	password := "backup-import-test-password"
	hash, err := auth.HashPassword(password)
	if err != nil {
		t.Fatal(err)
	}
	admin.PasswordHash = hash
	if err := st.Put(snap); err != nil {
		t.Fatal(err)
	}
	sess, _, err := auth.Login(st, admin.Username, password)
	if err != nil {
		t.Fatal(err)
	}
	return NewServer(st, t.TempDir()).Handler(), st, sess.Token
}

func backupMultipartRequest(t *testing.T, payload []byte) *http.Request {
	t.Helper()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile("file", "backup.zip")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := part.Write(payload); err != nil {
		t.Fatal(err)
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/backups/import", &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	return req
}

func TestBackupImportRejectsOversizedMultipartRequest(t *testing.T) {
	handler, _, token := backupImportTestHandler(t)
	payload := bytes.Repeat([]byte("x"), maxBackupUploadBytes+1)
	req := backupMultipartRequest(t, payload)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("oversized import status=%d body=%s", rec.Code, rec.Body.String())
	}
}

func TestBackupImportRejectsZipExpansionBeyondLimit(t *testing.T) {
	handler, _, token := backupImportTestHandler(t)
	var archive bytes.Buffer
	zw := zip.NewWriter(&archive)
	entry, err := zw.Create(backupSnapshotArchiveEntry)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := entry.Write([]byte(strings.Repeat("A", maxBackupUploadBytes+1))); err != nil {
		t.Fatal(err)
	}
	if err := zw.Close(); err != nil {
		t.Fatal(err)
	}

	req := backupMultipartRequest(t, archive.Bytes())
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("zip expansion status=%d body=%s", rec.Code, rec.Body.String())
	}
}

func TestBackupImportAcceptsExportArchiveEntryName(t *testing.T) {
	handler, st, token := backupImportTestHandler(t)
	tenantIDs := st.ListTenantIDs()
	if len(tenantIDs) != 1 { t.Fatalf("expected one tenant, got %d", len(tenantIDs)) }
	snapshot := st.Get(tenantIDs[0])
	raw, err := json.Marshal(snapshot)
	if err != nil {
		t.Fatal(err)
	}
	var archive bytes.Buffer
	zw := zip.NewWriter(&archive)
	entry, err := zw.Create(backupSnapshotArchiveEntry)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := entry.Write(raw); err != nil {
		t.Fatal(err)
	}
	if _, err := zw.Create("meta.txt"); err != nil {
		t.Fatal(err)
	}
	if err := zw.Close(); err != nil {
		t.Fatal(err)
	}

	req := backupMultipartRequest(t, archive.Bytes())
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("valid archive status=%d body=%s", rec.Code, rec.Body.String())
	}
}
