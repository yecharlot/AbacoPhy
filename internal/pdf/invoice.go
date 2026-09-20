package pdf

import (
	"bytes"
	"fmt"
	"strings"

	"github.com/yecharlot/AbacoPhy/internal/domain"
)

// InvoicePDF genera un PDF simple (texto) listo para imprimir.
// No usa dependencias externas: PDF 1.4 mínimo con Helvetica.
func InvoicePDF(tenant domain.Tenant, inv domain.Invoice) []byte {
	var lines []string
	lines = append(lines, safe(tenant.Name))
	if tenant.TradeName != "" {
		lines = append(lines, safe(tenant.TradeName))
	}
	if tenant.TaxID != "" {
		lines = append(lines, "NIT/RUC: "+safe(tenant.TaxID))
	}
	if tenant.Address != "" {
		lines = append(lines, safe(tenant.Address))
	}
	if tenant.Phone != "" {
		lines = append(lines, "Tel: "+safe(tenant.Phone))
	}
	lines = append(lines, "")
	lines = append(lines, "FACTURA  "+safe(inv.Number))
	lines = append(lines, "Fecha: "+safe(inv.IssuedAt))
	lines = append(lines, "Estado: "+safe(estadoES(inv.Status)))
	lines = append(lines, "")
	lines = append(lines, "Cliente: "+safe(inv.ClientName))
	if inv.ClientTax != "" {
		lines = append(lines, "Doc. cliente: "+safe(inv.ClientTax))
	}
	lines = append(lines, "")
	lines = append(lines, "Descripcion                    Cant.    Precio      Importe")
	lines = append(lines, strings.Repeat("-", 58))
	for _, ln := range inv.Lines {
		desc := truncate(safe(ln.Description), 28)
		row := fmt.Sprintf("%-28s %6.2f %10.2f %12.2f", desc, ln.Qty, ln.UnitPrice, ln.Amount)
		lines = append(lines, row)
	}
	lines = append(lines, strings.Repeat("-", 58))
	cur := inv.Currency
	if cur == "" {
		cur = tenant.Currency
	}
	lines = append(lines, fmt.Sprintf("Subtotal: %s %.2f", cur, inv.Subtotal))
	if inv.Tax > 0 {
		lines = append(lines, fmt.Sprintf("Impuesto: %s %.2f", cur, inv.Tax))
	}
	lines = append(lines, fmt.Sprintf("TOTAL:    %s %.2f", cur, inv.Total))
	lines = append(lines, "")
	if inv.CID != "" {
		lines = append(lines, "CID: "+inv.CID)
	}
	lines = append(lines, "Documento generado por AbacoPhy")
	return buildTextPDF(lines)
}

func estadoES(s string) string {
	switch s {
	case "draft":
		return "Borrador"
	case "issued":
		return "Emitida"
	case "paid":
		return "Pagada"
	case "void":
		return "Anulada"
	default:
		return s
	}
}

func safe(s string) string {
	s = strings.Map(func(r rune) rune {
		if r < 32 || r > 126 {
			// mantener acentos como '?' en PDF core fonts
			if r >= 0xC0 {
				return '?'
			}
			return ' '
		}
		return r
	}, s)
	return s
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n-1] + "."
}

func buildTextPDF(lines []string) []byte {
	var content bytes.Buffer
	content.WriteString("BT\n/F1 11 Tf\n14 TL\n50 780 Td\n")
	for i, line := range lines {
		esc := strings.ReplaceAll(line, "\\", "\\\\")
		esc = strings.ReplaceAll(esc, "(", "\\(")
		esc = strings.ReplaceAll(esc, ")", "\\)")
		if i == 0 {
			content.WriteString(fmt.Sprintf("(%s) Tj\n", esc))
		} else {
			content.WriteString(fmt.Sprintf("T* (%s) Tj\n", esc))
		}
	}
	content.WriteString("ET")
	stream := content.Bytes()

	var out bytes.Buffer
	write := func(s string) { out.WriteString(s) }
	objs := []string{}
	// 1 catalog
	objs = append(objs, "<< /Type /Catalog /Pages 2 0 R >>")
	// 2 pages
	objs = append(objs, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>")
	// 3 page
	objs = append(objs, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>")
	// 4 content
	objs = append(objs, fmt.Sprintf("<< /Length %d >>\nstream\n%s\nendstream", len(stream), stream))
	// 5 font
	objs = append(objs, "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>")

	write("%PDF-1.4\n")
	offsets := []int{0}
	for i, obj := range objs {
		offsets = append(offsets, out.Len())
		write(fmt.Sprintf("%d 0 obj\n%s\nendobj\n", i+1, obj))
	}
	xref := out.Len()
	write(fmt.Sprintf("xref\n0 %d\n", len(objs)+1))
	write("0000000000 65535 f \n")
	for i := 1; i <= len(objs); i++ {
		write(fmt.Sprintf("%010d 00000 n \n", offsets[i]))
	}
	write(fmt.Sprintf("trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n", len(objs)+1, xref))
	return out.Bytes()
}
