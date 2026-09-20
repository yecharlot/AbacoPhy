package pdf

import (
	"fmt"
	"strings"
	"time"

	"github.com/yecharlot/AbacoPhy/internal/domain"
)

// PayrollPDF genera nómina imprimible (Carta) para llevar al banco.
func PayrollPDF(tenant domain.Tenant, slips []domain.Payslip, period string) []byte {
	var lines []string
	lines = append(lines, safe(tenant.Name))
	if tenant.Address != "" {
		lines = append(lines, safe(tenant.Address))
	}
	if tenant.Phone != "" {
		lines = append(lines, "Tel: "+safe(tenant.Phone))
	}
	lines = append(lines, "")
	lines = append(lines, "NOMINA DE PAGO")
	lines = append(lines, "Periodo: "+safe(period))
	lines = append(lines, "Emitida: "+time.Now().Format("2006-01-02 15:04"))
	lines = append(lines, "Formato: Carta (Letter)")
	lines = append(lines, strings.Repeat("-", 58))
	lines = append(lines, fmt.Sprintf("%-22s %10s %10s %10s %10s", "Trabajador", "Bruto", "SS trab.", "Vac.", "Neto"))
	lines = append(lines, strings.Repeat("-", 58))
	var totGross, totSS, totVac, totNet float64
	cur := tenant.Currency
	if cur == "" {
		cur = "CUP"
	}
	for _, p := range slips {
		name := truncate(safe(p.EmployeeName), 22)
		lines = append(lines, fmt.Sprintf("%-22s %10.2f %10.2f %10.2f %10.2f", name, p.Gross, p.SSWorker, p.VacationProv, p.Net))
		totGross += p.Gross
		totSS += p.SSWorker
		totVac += p.VacationProv
		totNet += p.Net
		if p.Currency != "" {
			cur = p.Currency
		}
	}
	lines = append(lines, strings.Repeat("-", 58))
	lines = append(lines, fmt.Sprintf("%-22s %10.2f %10.2f %10.2f %10.2f", "TOTALES ("+cur+")", totGross, totSS, totVac, totNet))
	lines = append(lines, "")
	lines = append(lines, "Documento para gestion de pago bancario / caja.")
	lines = append(lines, "Generado por AbacoPhy")
	return buildTextPDF(lines)
}
