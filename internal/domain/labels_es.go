package domain

// Etiquetas en español para tipos de cuenta y estados (UI / informes / trazas).

func AccountTypeES(t string) string {
	switch t {
	case "asset":
		return "Activo"
	case "liability":
		return "Pasivo"
	case "equity":
		return "Patrimonio"
	case "income":
		return "Ingreso"
	case "expense":
		return "Gasto"
	default:
		return t
	}
}

func AccountNatureES(n string) string {
	switch n {
	case "deudora":
		return "Deudora"
	case "acreedora":
		return "Acreedora"
	default:
		return n
	}
}

func InvoiceStatusES(s string) string {
	switch s {
	case "draft":
		return "Borrador"
	case "issued":
		return "Emitida"
	case "paid":
		return "Pagada"
	case "void", "cancelled":
		return "Anulada"
	default:
		return s
	}
}

func OrderStatusES(s string) string {
	switch s {
	case "pending":
		return "Pendiente"
	case "confirmed":
		return "Confirmado"
	case "cancelled":
		return "Cancelado"
	case "delivered":
		return "Entregado"
	default:
		return s
	}
}
