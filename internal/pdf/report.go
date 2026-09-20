package pdf

import (
	"fmt"
	"strings"
	"time"

	"github.com/yecharlot/AbacoPhy/internal/domain"
)

func BuildReportPDF(snap *domain.StoreSnapshot, kind, period, accountID string) ([]byte, error) {
	if snap == nil {
		return nil, fmt.Errorf("sin datos")
	}
	t := snap.Tenant
	base := t.Currency
	if base == "" {
		base = "CUP"
	}
	now := time.Now().Format("2006-01-02 15:04")
	lines := []string{
		"ABACOPHY — INFORME CONTABLE",
		strings.Repeat("=", 58),
		"Negocio: " + t.Name,
		"Slug: " + t.Slug,
		"Moneda base: " + base,
		"Fecha de emisión: " + now,
		"Periodo solicitado: " + periodLabel(period),
		strings.Repeat("-", 58),
	}
	eq := domain.EquationSnapshot(snap)
	switch kind {
	case "situacion":
		lines = append(lines, "ESTADO DE SITUACION")
		lines = append(lines, fmt.Sprintf("Activo:      %s %.2f", base, num(eq["activo"])))
		lines = append(lines, fmt.Sprintf("Pasivo:      %s %.2f", base, num(eq["pasivo"])))
		lines = append(lines, fmt.Sprintf("Patrimonio:  %s %.2f", base, num(eq["patrimonio"])))
		lines = append(lines, "")
		lines = append(lines, "Desglose de cuentas de activo / pasivo / patrimonio:")
		for _, a := range sortedAccounts(snap) {
			if a == nil || !a.Active {
				continue
			}
			if a.Type == "asset" || a.Type == "liability" || a.Type == "equity" {
				lines = append(lines, fmt.Sprintf("  %s %-28s %10.2f %s", a.Code, truncate(a.Name, 28), a.Balance, base))
			}
		}
	case "rendimiento":
		lines = append(lines, "ESTADO DE RENDIMIENTO")
		lines = append(lines, fmt.Sprintf("Ingresos:   %s %.2f", base, num(eq["ingresos"])))
		lines = append(lines, fmt.Sprintf("Gastos:     %s %.2f", base, num(eq["gastos"])))
		lines = append(lines, fmt.Sprintf("Resultado:  %s %.2f", base, num(eq["ingresos"])-num(eq["gastos"])))
		lines = append(lines, "")
		lines = append(lines, "Operaciones recientes:")
		for i, e := range snap.Entries {
			if i > 40 {
				break
			}
			lines = append(lines, fmt.Sprintf("  %s | %s | %8.2f %s | %s", e.Date, e.Type, e.Amount, e.Currency, truncate(e.Description, 24)))
		}
	case "cuenta_t":
		lines = append(lines, "CUENTA T")
		acc := snap.Accounts[accountID]
		if acc == nil {
			lines = append(lines, "Cuenta no especificada o no encontrada.")
		} else {
			lines = append(lines, fmt.Sprintf("Cuenta: %s — %s", acc.Code, acc.Name))
			lines = append(lines, fmt.Sprintf("Saldo: %s %.2f", base, acc.Balance))
			lines = append(lines, "Debe / Haber (movimientos vinculados):")
			for _, e := range snap.Entries {
				if e.AccountID == acc.ID || e.Counterpart == acc.ID {
					lines = append(lines, fmt.Sprintf("  %s | %8.2f | %s", e.Date, e.Amount, truncate(e.Description, 30)))
				}
			}
		}
	default: // ecuacion
		lines = append(lines, "ECUACION AMPLIADA DE LA CONTABILIDAD")
		lines = append(lines, fmt.Sprintf("Activo (%.2f) = Pasivo (%.2f) + Patrimonio (%.2f)", num(eq["activo"]), num(eq["pasivo"]), num(eq["patrimonio"])))
		lines = append(lines, fmt.Sprintf("              + (Ingresos %.2f - Gastos %.2f)", num(eq["ingresos"]), num(eq["gastos"])))
		lines = append(lines, "")
		lines = append(lines, "Desglose por tipo de cuenta:")
		for _, a := range sortedAccounts(snap) {
			if a == nil || !a.Active {
				continue
			}
			lines = append(lines, fmt.Sprintf("  [%s] %s %-24s %10.2f", a.Type, a.Code, truncate(a.Name, 24), a.Balance))
		}
	}
	lines = append(lines, strings.Repeat("-", 58))
	lines = append(lines, "Documento generado por AbacoPhy · trazable por CID")
	if snap.RootCID != "" {
		lines = append(lines, "CID: "+snap.RootCID)
	}
	return buildTextPDF(lines), nil
}

func periodLabel(p string) string {
	switch p {
	case "week":
		return "Semanal"
	case "month":
		return "Mensual"
	case "quarter":
		return "Trimestral"
	case "year":
		return "Anual"
	default:
		return "Todo el histórico"
	}
}

func num(v any) float64 {
	switch x := v.(type) {
	case float64:
		return x
	case int:
		return float64(x)
	default:
		return 0
	}
}

func sortedAccounts(snap *domain.StoreSnapshot) []*domain.Account {
	out := make([]*domain.Account, 0, len(snap.Accounts))
	for _, a := range snap.Accounts {
		out = append(out, a)
	}
	// simple insertion by code
	for i := 0; i < len(out); i++ {
		for j := i + 1; j < len(out); j++ {
			if out[j] != nil && out[i] != nil && out[j].Code < out[i].Code {
				out[i], out[j] = out[j], out[i]
			}
		}
	}
	return out
}
