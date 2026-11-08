package pdf

import (
	"fmt"

	"github.com/yecharlot/AbacoPhy/internal/domain"
)

const (
	MaxPDFExportRecords    = 2000
	MaxPDFExportFieldBytes = 1024
	MaxPDFExportBytes      = 8 << 20
)

func validatePDFField(label, value string) error {
	if len(value) > MaxPDFExportFieldBytes {
		return fmt.Errorf("%s supera el tamaño máximo permitido", label)
	}
	return nil
}

func ValidateInvoiceExport(tenant domain.Tenant, inv domain.Invoice) error {
	if len(inv.Lines) > MaxPDFExportRecords {
		return fmt.Errorf("la factura supera el máximo de líneas")
	}
	for label, value := range map[string]string{
		"nombre del negocio": tenant.Name, "nombre comercial": tenant.TradeName,
		"identificación fiscal": tenant.TaxID, "dirección": tenant.Address,
		"teléfono": tenant.Phone, "número de factura": inv.Number,
		"fecha": inv.IssuedAt, "cliente": inv.ClientName, "documento del cliente": inv.ClientTax,
		"estado": inv.Status, "CID": inv.CID, "moneda": inv.Currency,
	} {
		if err := validatePDFField(label, value); err != nil { return err }
	}
	for _, line := range inv.Lines {
		if err := validatePDFField("descripción de línea", line.Description); err != nil { return err }
	}
	return nil
}

func ValidatePayrollExport(tenant domain.Tenant, slips []domain.Payslip, period string) error {
	if len(slips) > MaxPDFExportRecords {
		return fmt.Errorf("la nómina supera el máximo de liquidaciones")
	}
	for label, value := range map[string]string{
		"nombre del negocio": tenant.Name, "dirección": tenant.Address,
		"teléfono": tenant.Phone, "periodo": period, "moneda": tenant.Currency,
	} {
		if err := validatePDFField(label, value); err != nil { return err }
	}
	for _, slip := range slips {
		if err := validatePDFField("nombre del trabajador", slip.EmployeeName); err != nil { return err }
		if err := validatePDFField("moneda de liquidación", slip.Currency); err != nil { return err }
	}
	return nil
}

func validateReportExport(snap *domain.StoreSnapshot) error {
	if len(snap.Accounts) > MaxPDFExportRecords || len(snap.Entries) > MaxPDFExportRecords {
		return fmt.Errorf("el informe supera el máximo de registros")
	}
	for label, value := range map[string]string{
		"nombre del negocio": snap.Tenant.Name, "slug": snap.Tenant.Slug,
		"moneda": snap.Tenant.Currency,
	} {
		if err := validatePDFField(label, value); err != nil { return err }
	}
	for _, account := range snap.Accounts {
		if account == nil { continue }
		if err := validatePDFField("código de cuenta", account.Code); err != nil { return err }
		if err := validatePDFField("nombre de cuenta", account.Name); err != nil { return err }
	}
	for _, entry := range snap.Entries {
		if err := validatePDFField("descripción de operación", entry.Description); err != nil { return err }
		if err := validatePDFField("fecha de operación", entry.Date); err != nil { return err }
		if err := validatePDFField("moneda de operación", entry.Currency); err != nil { return err }
	}
	return nil
}
