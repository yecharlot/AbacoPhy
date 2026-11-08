package pdf

import (
	"strings"
	"testing"

	"github.com/yecharlot/AbacoPhy/internal/domain"
)

func TestValidateInvoiceExportEnforcesLineAndFieldLimits(t *testing.T) {
	inv := domain.Invoice{Lines: make([]domain.InvoiceLine, MaxPDFExportRecords+1)}
	if err := ValidateInvoiceExport(domain.Tenant{}, inv); err == nil {
		t.Fatal("expected invoice line limit error")
	}
	inv = domain.Invoice{ClientName: strings.Repeat("x", MaxPDFExportFieldBytes+1)}
	if err := ValidateInvoiceExport(domain.Tenant{}, inv); err == nil {
		t.Fatal("expected invoice field limit error")
	}
}

func TestValidatePayrollExportEnforcesRecordAndFieldLimits(t *testing.T) {
	slips := make([]domain.Payslip, MaxPDFExportRecords+1)
	if err := ValidatePayrollExport(domain.Tenant{}, slips, "all"); err == nil {
		t.Fatal("expected payroll record limit error")
	}
	slips = []domain.Payslip{{EmployeeName: strings.Repeat("x", MaxPDFExportFieldBytes+1)}}
	if err := ValidatePayrollExport(domain.Tenant{}, slips, "all"); err == nil {
		t.Fatal("expected payroll field limit error")
	}
}

func TestBuildReportPDFRejectsExcessiveRecordCount(t *testing.T) {
	snap := domain.BootstrapTenant("PDF limits", "pdf-limits", "CUP")
	for i := 0; i <= MaxPDFExportRecords; i++ {
		snap.Entries = append(snap.Entries, domain.Entry{ID: "entry-" + string(rune(i)), Description: "test"})
	}
	if _, err := BuildReportPDF(snap, "rendimiento", "all", ""); err == nil {
		t.Fatal("expected report record limit error")
	}
}
