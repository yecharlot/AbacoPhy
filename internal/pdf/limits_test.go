package pdf

import (
	"fmt"
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
	if err := ValidateInvoiceExport(domain.Tenant{Currency: strings.Repeat("x", MaxPDFExportFieldBytes+1)}, domain.Invoice{}); err == nil {
		t.Fatal("expected tenant currency field limit error")
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
		snap.Entries = append(snap.Entries, domain.Entry{ID: fmt.Sprintf("entry-%d", i), Description: "test"})
	}
	if _, err := BuildReportPDF(snap, "rendimiento", "all", ""); err == nil {
		t.Fatal("expected report record limit error")
	}
}

func TestBuildReportPDFValidatesEveryPrintedTextField(t *testing.T) {
	t.Run("entry type", func(t *testing.T) {
		snap := domain.BootstrapTenant("PDF limits", "pdf-limits", "CUP")
		snap.Entries = []domain.Entry{{Type: strings.Repeat("x", MaxPDFExportFieldBytes+1)}}
		if _, err := BuildReportPDF(snap, "rendimiento", "all", ""); err == nil { t.Fatal("expected entry type limit error") }
	})
	t.Run("account type", func(t *testing.T) {
		snap := domain.BootstrapTenant("PDF limits", "pdf-limits", "CUP")
		snap.Accounts["long-type"] = &domain.Account{ID: "long-type", Type: strings.Repeat("x", MaxPDFExportFieldBytes+1)}
		if _, err := BuildReportPDF(snap, "situacion", "all", ""); err == nil { t.Fatal("expected account type limit error") }
	})
	t.Run("root CID", func(t *testing.T) {
		snap := domain.BootstrapTenant("PDF limits", "pdf-limits", "CUP")
		snap.RootCID = strings.Repeat("x", MaxPDFExportFieldBytes+1)
		if _, err := BuildReportPDF(snap, "ecuacion", "all", ""); err == nil { t.Fatal("expected root CID limit error") }
	})
}
