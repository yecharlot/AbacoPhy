package api

import (
	"archive/zip"
	"bytes"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/yecharlot/AbacoPhy/internal/auth"
	"github.com/yecharlot/AbacoPhy/internal/domain"
	"github.com/yecharlot/AbacoPhy/internal/store"
)

func exportIsolationFixture(t *testing.T) (*store.Store, http.Handler, string, *domain.StoreSnapshot, *domain.StoreSnapshot) {
	t.Helper()
	st := store.New(t.TempDir())

	tenantA := domain.BootstrapTenant("Export Tenant A", "export-tenant-a", "CUP")
	adminA := userByName(tenantA, "admin")
	if adminA == nil {
		t.Fatal("tenant A admin missing")
	}
	adminA.MustChangePassword = false
	const password = "export-isolation-password-a"
	adminA.PasswordHash = mustHashForTenantIsolationTest(t, password)

	tenantB := domain.BootstrapTenant("Export Tenant B SECRET", "export-tenant-b", "CUP")
	for _, user := range tenantB.Users {
		if user != nil {
			user.Username = "tenant-b-" + user.Username
		}
	}
	tenantB.Invoices = []domain.Invoice{{
		ID: "foreign-invoice-id", TenantID: tenantB.Tenant.ID, Number: "FOREIGN-INVOICE-SECRET",
		ClientName: "FOREIGN-CUSTOMER-SECRET", Currency: "CUP", Status: "issued",
		Lines: []domain.InvoiceLine{{Description: "FOREIGN-INVOICE-LINE-SECRET", Qty: 1, UnitPrice: 900, Amount: 900}},
		Total: 900, CreatedAt: time.Now().UTC(),
	}}
	tenantB.Payslips = []domain.Payslip{{
		ID: "foreign-payslip-id", TenantID: tenantB.Tenant.ID, EmployeeName: "FOREIGN-PAYROLL-SECRET",
		Period: "2026-11", Gross: 900, Net: 900, Currency: "CUP",
	}}
	tenantB.Entries = []domain.Entry{{
		ID: "foreign-entry-id", TenantID: tenantB.Tenant.ID, Date: "2026-11-01",
		Type: "income", Amount: 900, Currency: "CUP", Description: "FOREIGN-REPORT-SECRET",
	}}
	tenantB.Backups = []domain.BackupMeta{{CID: "FOREIGN-BACKUP-CID-SECRET", Label: "foreign backup"}}

	tenantA.Invoices = []domain.Invoice{{
		ID: "local-invoice-id", TenantID: tenantA.Tenant.ID, Number: "LOCAL-INVOICE",
		ClientName: "Local Customer", Currency: "CUP", Status: "issued",
		Lines: []domain.InvoiceLine{{Description: "Local invoice line", Qty: 1, UnitPrice: 10, Amount: 10}},
		Total: 10, CreatedAt: time.Now().UTC(),
	}}
	tenantA.Payslips = []domain.Payslip{{
		ID: "local-payslip-id", TenantID: tenantA.Tenant.ID, EmployeeName: "Local Payroll Employee",
		Period: "2026-11", Gross: 10, Net: 10, Currency: "CUP",
	}}
	tenantA.Entries = []domain.Entry{{
		ID: "local-entry-id", TenantID: tenantA.Tenant.ID, Date: "2026-11-01",
		Type: "income", Amount: 10, Currency: "CUP", Description: "LOCAL-REPORT-ENTRY",
	}}
	tenantA.Backups = []domain.BackupMeta{{CID: "LOCAL-BACKUP-CID", Label: "local backup"}}

	if err := st.Put(tenantA); err != nil {
		t.Fatal(err)
	}
	if err := st.Put(tenantB); err != nil {
		t.Fatal(err)
	}
	sess, _, err := auth.Login(st, adminA.Username, password)
	if err != nil {
		t.Fatal(err)
	}
	return st, NewServer(st, t.TempDir()).Handler(), sess.Token, tenantA, tenantB
}

func exportRequest(handler http.Handler, method, path, token string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, nil)
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	return rec
}

func TestInvoicePDFCannotReadAnotherTenantInvoice(t *testing.T) {
	_, handler, token, _, _ := exportIsolationFixture(t)

	foreign := exportRequest(handler, http.MethodGet, "/api/v1/invoices/pdf?id=foreign-invoice-id", token)
	if foreign.Code != http.StatusNotFound {
		t.Fatalf("foreign invoice status=%d body=%s", foreign.Code, foreign.Body.String())
	}
	local := exportRequest(handler, http.MethodGet, "/api/v1/invoices/pdf?id=local-invoice-id", token)
	if local.Code != http.StatusOK {
		t.Fatalf("local invoice status=%d body=%s", local.Code, local.Body.String())
	}
	if got := local.Header().Get("Content-Type"); !strings.HasPrefix(got, "application/pdf") {
		t.Fatalf("local invoice content type=%q", got)
	}
}

func TestBackupListAndExportContainOnlySessionTenant(t *testing.T) {
	_, handler, token, tenantA, tenantB := exportIsolationFixture(t)

	list := exportRequest(handler, http.MethodGet, "/api/v1/backups", token)
	if list.Code != http.StatusOK {
		t.Fatalf("backup list status=%d body=%s", list.Code, list.Body.String())
	}
	if strings.Contains(list.Body.String(), "FOREIGN-BACKUP-CID-SECRET") {
		t.Fatal("backup list exposed another tenant's CID")
	}
	if !strings.Contains(list.Body.String(), "LOCAL-BACKUP-CID") {
		t.Fatal("backup list omitted requesting tenant's backup")
	}

	exported := exportRequest(handler, http.MethodGet, "/api/v1/backups/export?as=zip", token)
	if exported.Code != http.StatusOK {
		t.Fatalf("backup export status=%d body=%s", exported.Code, exported.Body.String())
	}
	reader, err := zip.NewReader(bytes.NewReader(exported.Body.Bytes()), int64(exported.Body.Len()))
	if err != nil {
		t.Fatalf("export is not a valid ZIP: %v", err)
	}
	var snapshotJSON []byte
	for _, entry := range reader.File {
		if entry.Name != backupSnapshotArchiveEntry {
			continue
		}
		rc, err := entry.Open()
		if err != nil {
			t.Fatal(err)
		}
		snapshotJSON, err = io.ReadAll(rc)
		_ = rc.Close()
		if err != nil {
			t.Fatal(err)
		}
	}
	if len(snapshotJSON) == 0 {
		t.Fatal("export ZIP is missing its snapshot")
	}
	var exportedSnapshot domain.StoreSnapshot
	if err := json.Unmarshal(snapshotJSON, &exportedSnapshot); err != nil {
		t.Fatal(err)
	}
	if exportedSnapshot.Tenant.ID != tenantA.Tenant.ID {
		t.Fatalf("export tenant=%q, want %q", exportedSnapshot.Tenant.ID, tenantA.Tenant.ID)
	}
	if exportedSnapshot.Tenant.ID == tenantB.Tenant.ID ||
		bytes.Contains(snapshotJSON, []byte("FOREIGN-INVOICE-SECRET")) ||
		bytes.Contains(snapshotJSON, []byte("FOREIGN-PAYROLL-SECRET")) ||
		bytes.Contains(snapshotJSON, []byte("FOREIGN-REPORT-SECRET")) {
		t.Fatal("backup export contains data from another tenant")
	}
}

func TestPDFExportsRequireAuthenticatedSession(t *testing.T) {
	_, handler, _, _, _ := exportIsolationFixture(t)
	for _, path := range []string{
		"/api/v1/invoices/pdf?id=local-invoice-id",
		"/api/v1/payroll/pdf?period=all",
		"/api/v1/reports/pdf?kind=rendimiento&period=all",
		"/api/v1/backups/export?as=zip",
	} {
		t.Run(path, func(t *testing.T) {
			rec := exportRequest(handler, http.MethodGet, path, "")
			if rec.Code != http.StatusUnauthorized {
				t.Fatalf("unauthenticated export status=%d body=%s", rec.Code, rec.Body.String())
			}
		})
	}
}

func TestPayrollAndReportPDFExportsAreTenantScoped(t *testing.T) {
	_, handler, token, _, _ := exportIsolationFixture(t)

	payroll := exportRequest(handler, http.MethodGet, "/api/v1/payroll/pdf?period=all", token)
	if payroll.Code != http.StatusOK {
		t.Fatalf("payroll PDF status=%d body=%s", payroll.Code, payroll.Body.String())
	}
	if bytes.Contains(payroll.Body.Bytes(), []byte("FOREIGN-PAYROLL-SECRET")) {
		t.Fatal("payroll PDF contains another tenant's employee data")
	}

	report := exportRequest(handler, http.MethodGet, "/api/v1/reports/pdf?kind=rendimiento&period=all", token)
	if report.Code != http.StatusOK {
		t.Fatalf("report PDF status=%d body=%s", report.Code, report.Body.String())
	}
	if bytes.Contains(report.Body.Bytes(), []byte("FOREIGN-REPORT-SECRET")) {
		t.Fatal("report PDF contains another tenant's accounting entry")
	}
}

func TestBackupExportJSONEnvelopeDecodesExpectedZIP(t *testing.T) {
	_, handler, token, tenantA, _ := exportIsolationFixture(t)
	rec := exportRequest(handler, http.MethodGet, "/api/v1/backups/export", token)
	if rec.Code != http.StatusOK {
		t.Fatalf("backup JSON export status=%d body=%s", rec.Code, rec.Body.String())
	}
	var payload struct {
		DataBase64 string `json:"data_base64"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatal(err)
	}
	raw, err := base64.StdEncoding.DecodeString(payload.DataBase64)
	if err != nil {
		t.Fatal(err)
	}
	reader, err := zip.NewReader(bytes.NewReader(raw), int64(len(raw)))
	if err != nil {
		t.Fatal(err)
	}
	found := false
	for _, entry := range reader.File {
		if entry.Name == backupSnapshotArchiveEntry {
			found = true
		}
	}
	if !found || tenantA.Tenant.ID == "" {
		t.Fatal("JSON export did not contain the requesting tenant's snapshot")
	}
}


func TestSensitiveExportEndpointsRejectUnsupportedMethods(t *testing.T) {
	_,h,_,_,_:=exportIsolationFixture(t)
	for _,p:=range []string{"/api/v1/invoices/pdf?id=local-invoice-id","/api/v1/payroll/pdf?period=all","/api/v1/reports/pdf?kind=rendimiento&period=all","/api/v1/backups/export?as=zip"} {
		t.Run(p,func(t *testing.T){ r:=exportRequest(h,http.MethodPost,p,""); if r.Code!=405 { t.Fatalf("status=%d",r.Code) }; if r.Header().Get("Allow")!="GET, HEAD" { t.Fatalf("Allow=%q",r.Header().Get("Allow")) }; if r.Header().Get("Cache-Control")!="no-store, private" { t.Fatalf("Cache-Control=%q",r.Header().Get("Cache-Control")) } })
	}
}
func TestSensitiveExportResponsesArePrivateNoStore(t *testing.T) {
	_,h,token,_,_:=exportIsolationFixture(t)
	for _,p:=range []string{"/api/v1/invoices/pdf?id=local-invoice-id","/api/v1/payroll/pdf?period=all","/api/v1/reports/pdf?kind=rendimiento&period=all","/api/v1/backups/export?as=zip","/api/v1/backups/export"} {
		t.Run(p,func(t *testing.T){ r:=exportRequest(h,http.MethodGet,p,token); if r.Code!=200 { t.Fatalf("status=%d",r.Code) }; if r.Header().Get("Cache-Control")!="no-store, private" { t.Fatalf("Cache-Control=%q",r.Header().Get("Cache-Control")) }; if r.Header().Get("Pragma")!="no-cache" { t.Fatalf("Pragma=%q",r.Header().Get("Pragma")) }; vary:=strings.Join(r.Header().Values("Vary"), ","); if !strings.Contains(vary,"Authorization") || !strings.Contains(vary,"Cookie") { t.Fatalf("Vary=%q",vary) } })
	}
}
func TestSensitivePDFHeadRequestsDoNotReturnBody(t *testing.T) {
	_,h,token,_,_:=exportIsolationFixture(t)
	for _,p:=range []string{"/api/v1/invoices/pdf?id=local-invoice-id","/api/v1/payroll/pdf?period=all","/api/v1/reports/pdf?kind=rendimiento&period=all","/api/v1/backups/export?as=zip"} {
		t.Run(p,func(t *testing.T){ r:=exportRequest(h,http.MethodHead,p,token); if r.Code!=200 { t.Fatalf("status=%d body=%s",r.Code,r.Body.String()) }; if r.Body.Len()!=0 { t.Fatalf("HEAD returned %d bytes",r.Body.Len()) } })
	}
}


func TestBackupExportRejectsUnknownFormat(t *testing.T) {
	_, handler, token, _, _ := exportIsolationFixture(t)
	rec := exportRequest(handler, http.MethodGet, "/api/v1/backups/export?as=../../secret", token)
	if rec.Code != http.StatusBadRequest { t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String()) }
	if got := rec.Header().Get("Cache-Control"); got != "no-store, private" { t.Errorf("Cache-Control=%q", got) }
}

func TestSafeDownloadFilenamePart(t *testing.T) {
	cases := map[string]string{
		"invoice/../private\\name": "invoice-..-private-name",
		"../../": "documento",
		"  INV #42  ": "INV-42",
	}
	for input, want := range cases {
		if got := safeDownloadFilenamePart(input); got != want { t.Errorf("safeDownloadFilenamePart(%q)=%q, want %q", input, got, want) }
	}
}


func TestSensitiveExportPreservesCORSVaryHeader(t *testing.T) {
	_, handler, token, _, _ := exportIsolationFixture(t)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/invoices/pdf?id=local-invoice-id", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Origin", "https://client.example")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK { t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String()) }
	vary := strings.Join(rec.Header().Values("Vary"), ",")
	for _, value := range []string{"Origin", "Authorization", "Cookie"} {
		if !strings.Contains(vary, value) { t.Errorf("Vary=%q does not include %q", vary, value) }
	}
}


func TestBackupExportAcceptsBase64CompatibilityMode(t *testing.T) {
	_, handler, token, _, _ := exportIsolationFixture(t)
	rec := exportRequest(handler, http.MethodGet, "/api/v1/backups/export?as=base64", token)
	if rec.Code != http.StatusOK { t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String()) }
	var payload struct { DataBase64 string `json:"data_base64"` }
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil { t.Fatal(err) }
	if payload.DataBase64 == "" { t.Fatal("base64 compatibility response omitted data_base64") }
	if got := rec.Header().Get("Content-Length"); got != strconv.Itoa(rec.Body.Len()) {
		t.Fatalf("Content-Length=%q, actual body bytes=%d", got, rec.Body.Len())
	}
}


func TestSensitiveExportsPersistAuditBeforeReturningContent(t *testing.T) {
	st, handler, token, tenantA, _ := exportIsolationFixture(t)
	tenantID := tenantA.Tenant.ID
	cases := []struct{ path, action string }{
		{"/api/v1/invoices/pdf?id=local-invoice-id", "factura.exportacion_pdf"},
		{"/api/v1/payroll/pdf?period=all", "nomina.exportacion_pdf"},
		{"/api/v1/reports/pdf?kind=rendimiento&period=all", "informe.exportacion_pdf"},
		{"/api/v1/backups/export?as=zip", "salva.exportacion_zip"},
	}
	for _, tc := range cases {
		t.Run(tc.action, func(t *testing.T) {
			before := len(st.Get(tenantID).AuditLog)
			rec := exportRequest(handler, http.MethodGet, tc.path, token)
			if rec.Code != http.StatusOK || rec.Body.Len() == 0 {
				t.Fatalf("export status=%d body=%s", rec.Code, rec.Body.String())
			}
			entries := st.Get(tenantID).AuditLog
			if len(entries) != before+1 {
				t.Fatalf("audit entries=%d, want %d", len(entries), before+1)
			}
			last := entries[len(entries)-1]
			if last.Action != tc.action || last.UserID == "" || last.CreatedAt.IsZero() {
				t.Fatalf("unexpected durable audit entry: %#v", last)
			}
		})
	}
}

func TestSensitiveExportFailsClosedWhenAuditCannotBePersisted(t *testing.T) {
	st, handler, token, _, _ := exportIsolationFixture(t)
	cidsDir := filepath.Join(st.DataDir(), "cids")
	if err := os.Rename(cidsDir, cidsDir+".blocked"); err != nil { t.Fatal(err) }
	if err := os.WriteFile(cidsDir, []byte("not a directory"), 0600); err != nil { t.Fatal(err) }
	for _, path := range []string{
		"/api/v1/invoices/pdf?id=local-invoice-id",
		"/api/v1/payroll/pdf?period=all",
		"/api/v1/reports/pdf?kind=rendimiento&period=all",
		"/api/v1/backups/export?as=zip",
	} {
		rec := exportRequest(handler, http.MethodGet, path, token)
		if rec.Code != http.StatusInternalServerError {
			t.Errorf("%s: status=%d body=%s, want 500", path, rec.Code, rec.Body.String())
		}
		if rec.Body.Len() == 0 || bytes.Contains(rec.Body.Bytes(), []byte("%PDF-")) || bytes.Contains(rec.Body.Bytes(), []byte{0x50, 0x4b, 0x03, 0x04}) {
			t.Errorf("%s: sensitive export content was returned after audit failure", path)
		}
		if rec.Header().Get("Cache-Control") != "no-store, private" {
			t.Errorf("%s: missing private no-store header", path)
		}
	}
}


// TestExportLimitWriterRejectsOverflow verifies the writer stops at its byte budget.
func TestExportLimitWriterRejectsOverflow(t *testing.T) {
	var dst bytes.Buffer
	writer := &exportLimitWriter{writer: &dst, remaining: 4}
	if _, err := writer.Write([]byte("1234")); err != nil { t.Fatalf("exact limit: %v", err) }
	if _, err := writer.Write([]byte("5")); !errors.Is(err, errExportLimitExceeded) {
		t.Fatalf("overflow error=%v, want errExportLimitExceeded", err)
	}
	if dst.String() != "1234" { t.Fatalf("written=%q, want 1234", dst.String()) }
}

func TestBackupExportRejectsOversizedSnapshot(t *testing.T) {
	st, handler, token, tenantA, _ := exportIsolationFixture(t)
	tenantA.Tenant.Name = strings.Repeat("X", maxBackupExportSnapshotBytes)
	if err := st.Put(tenantA); err != nil { t.Fatal(err) }
	rec := exportRequest(handler, http.MethodGet, "/api/v1/backups/export?as=zip", token)
	if rec.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("oversized snapshot status=%d body=%s, want 413", rec.Code, rec.Body.String())
	}
	if rec.Header().Get("Cache-Control") != "no-store, private" {
		t.Fatalf("Cache-Control=%q", rec.Header().Get("Cache-Control"))
	}
}


func TestPDFExportEndpointsRejectExcessiveRecords(t *testing.T) {
	t.Run("invoice", func(t *testing.T) {
		_, handler, token, tenant, _ := exportIsolationFixture(t)
		tenant.Invoices[0].Lines = make([]domain.InvoiceLine, 2001)
		rec := exportRequest(handler, http.MethodGet, "/api/v1/invoices/pdf?id=local-invoice-id", token)
		if rec.Code != http.StatusRequestEntityTooLarge { t.Fatalf("status=%d body=%s, want 413", rec.Code, rec.Body.String()) }
		if bytes.Contains(rec.Body.Bytes(), []byte("%PDF-")) { t.Fatal("oversized invoice PDF was returned") }
	})
	t.Run("payroll", func(t *testing.T) {
		_, handler, token, tenant, _ := exportIsolationFixture(t)
		tenant.Payslips = make([]domain.Payslip, 2001)
		for i := range tenant.Payslips { tenant.Payslips[i].Period = "2026-11" }
		rec := exportRequest(handler, http.MethodGet, "/api/v1/payroll/pdf?period=all", token)
		if rec.Code != http.StatusRequestEntityTooLarge { t.Fatalf("status=%d body=%s, want 413", rec.Code, rec.Body.String()) }
		if bytes.Contains(rec.Body.Bytes(), []byte("%PDF-")) { t.Fatal("oversized payroll PDF was returned") }
	})
	t.Run("report", func(t *testing.T) {
		_, handler, token, tenant, _ := exportIsolationFixture(t)
		tenant.Entries = make([]domain.Entry, 2001)
		rec := exportRequest(handler, http.MethodGet, "/api/v1/reports/pdf?kind=rendimiento&period=all", token)
		if rec.Code != http.StatusRequestEntityTooLarge { t.Fatalf("status=%d body=%s, want 413", rec.Code, rec.Body.String()) }
		if bytes.Contains(rec.Body.Bytes(), []byte("%PDF-")) { t.Fatal("oversized report PDF was returned") }
	})
}
