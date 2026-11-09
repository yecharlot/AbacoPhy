package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/yecharlot/AbacoPhy/internal/auth"
	"github.com/yecharlot/AbacoPhy/internal/domain"
	"github.com/yecharlot/AbacoPhy/internal/store"
)

func payrollPayslipTestHandler(t *testing.T) (http.Handler, *store.Store, string, string) {
	t.Helper()
	st := store.New(t.TempDir())
	snap := domain.BootstrapTenant("Payroll test", "payroll-test", "CUP")
	admin := userByName(snap, "admin")
	if admin == nil {
		t.Fatal("admin user missing")
	}
	admin.MustChangePassword = false
	password := "payroll-test-password"
	hash, err := auth.HashPassword(password)
	if err != nil {
		t.Fatal(err)
	}
	admin.PasswordHash = hash

	employeeID := "39f9f501-d136-46b0-b45c-2b4098b99885"
	snap.Employees[employeeID] = &domain.Employee{
		ID: employeeID, TenantID: snap.Tenant.ID, Name: "Empleado de prueba",
		Salary: 10000, Currency: "CUP", VacRate: 0.09,
		SSEmployerRate: 0.125, SSWorkerRate: 0.05, Active: true,
	}
	if err := st.Put(snap); err != nil {
		t.Fatal(err)
	}
	sess, _, err := auth.Login(st, admin.Username, password)
	if err != nil {
		t.Fatal(err)
	}
	return NewServer(st, t.TempDir()).Handler(), st, sess.Token, employeeID
}

func payrollPayslipRequest(handler http.Handler, token, payload string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/payroll/payslips", bytes.NewBufferString(payload))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	return rec
}

func TestCreatePayslipAcceptsCanonicalPayloadAndPersists(t *testing.T) {
	handler, st, token, employeeID := payrollPayslipTestHandler(t)
	payload := `{"employee_id":"` + employeeID + `","period":"2026-11","other_deductions":0}`
	rec := payrollPayslipRequest(handler, token, payload)
	if rec.Code != http.StatusCreated {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}
	var response struct {
		Payslip domain.Payslip `json:"payslip"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatal(err)
	}
	if response.Payslip.EmployeeID != employeeID || response.Payslip.Period != "2026-11" {
		t.Fatalf("unexpected payslip response: %+v", response.Payslip)
	}
	snap := st.Get(response.Payslip.TenantID)
	if snap == nil || len(snap.Payslips) != 1 {
		t.Fatalf("payslip was not persisted")
	}
}

func TestCreatePayslipReportsMetadataTypeMismatchClearly(t *testing.T) {
	handler, _, token, employeeID := payrollPayslipTestHandler(t)
	payload := `{"employee_id":"` + employeeID + `","period":"2026-11","metadata":"{\"employeeId\":\"x\"}"}`
	rec := payrollPayslipRequest(handler, token, payload)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}
	var response map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatal(err)
	}
	if response["code"] != "metadata_must_be_object" || response["field"] != "metadata" {
		t.Fatalf("unexpected validation response: %s", rec.Body.String())
	}
}

func TestCreatePayslipDistinguishesMissingEmployeeFromMalformedJSON(t *testing.T) {
	handler, _, token, _ := payrollPayslipTestHandler(t)

	missing := payrollPayslipRequest(handler, token, `{"period":"2026-11"}`)
	if missing.Code != http.StatusBadRequest {
		t.Fatalf("missing employee status=%d body=%s", missing.Code, missing.Body.String())
	}
	var missingBody map[string]any
	if err := json.Unmarshal(missing.Body.Bytes(), &missingBody); err != nil {
		t.Fatal(err)
	}
	if missingBody["code"] != "missing_employee_id" {
		t.Fatalf("unexpected missing employee response: %s", missing.Body.String())
	}

	malformed := payrollPayslipRequest(handler, token, `{"employee_id":]}`)
	if malformed.Code != http.StatusBadRequest {
		t.Fatalf("malformed JSON status=%d body=%s", malformed.Code, malformed.Body.String())
	}
	var malformedBody map[string]any
	if err := json.Unmarshal(malformed.Body.Bytes(), &malformedBody); err != nil {
		t.Fatal(err)
	}
	if malformedBody["code"] != "invalid_json" {
		t.Fatalf("unexpected malformed JSON response: %s", malformed.Body.String())
	}
}
