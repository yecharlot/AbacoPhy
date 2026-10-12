package domain

import (
	"fmt"
	"strings"
)

// TransferLineInput es la línea recibida del cliente antes de enriquecer costos.
type TransferLineInput struct {
	ProductID string
	Qty       float64
}

// TransferValidationError describe un fallo de validación sin mutar el snapshot.
type TransferValidationError struct {
	Code    string // unit_invalid | product_invalid | qty_invalid | stock_insufficient | empty_lines
	Message string
	Product string // código o id si aplica
}

func (e *TransferValidationError) Error() string {
	if e == nil {
		return ""
	}
	return e.Message
}

// AggregateTransferDemand suma cantidades por product_id (varias líneas del mismo SKU).
func AggregateTransferDemand(lines []TransferLineInput) map[string]float64 {
	out := make(map[string]float64)
	for _, ln := range lines {
		pid := strings.TrimSpace(ln.ProductID)
		if pid == "" {
			continue
		}
		out[pid] += ln.Qty
	}
	return out
}

// ValidateTransferStock comprueba unidad, productos y stock de almacén SIN mutar.
// demand: productID → cantidad total a transferir.
func ValidateTransferStock(snap *StoreSnapshot, unitID string, demand map[string]float64) error {
	if snap == nil {
		return &TransferValidationError{Code: "snapshot", Message: "negocio no encontrado"}
	}
	unitID = strings.TrimSpace(unitID)
	if unitID == "" {
		return &TransferValidationError{Code: "unit_invalid", Message: "unidad de venta requerida"}
	}
	unit := snap.SalesUnits[unitID]
	if unit == nil || !unit.Active {
		return &TransferValidationError{Code: "unit_invalid", Message: "unidad de venta no válida o inactiva"}
	}
	if len(demand) == 0 {
		return &TransferValidationError{Code: "empty_lines", Message: "líneas de transferencia requeridas"}
	}
	for productID, need := range demand {
		if need <= 0 {
			return &TransferValidationError{
				Code:    "qty_invalid",
				Message: "cantidad debe ser mayor que cero",
				Product: productID,
			}
		}
		p := snap.Products[productID]
		if p == nil || !p.Active {
			code := productID
			if p != nil {
				code = p.Code
			}
			return &TransferValidationError{
				Code:    "product_invalid",
				Message: fmt.Sprintf("producto no válido o inactivo (%s)", code),
				Product: code,
			}
		}
		st := snap.WarehouseStock[productID]
		avail := 0.0
		if st != nil {
			avail = st.Qty
		}
		// Tolerancia numérica mínima para float.
		if avail+1e-9 < need {
			return &TransferValidationError{
				Code: "stock_insufficient",
				Message: fmt.Sprintf(
					"stock insuficiente de %s (%s): disponible %.4f, solicitado %.4f",
					p.Name, p.Code, avail, need,
				),
				Product: p.Code,
			}
		}
	}
	return nil
}

// ApplyWarehouseToUnitTransfer descuenta almacén e incrementa stock del PDV.
// Debe llamarse solo tras ValidateTransferStock. No escribe Transfer ni auditoría.
// Devuelve líneas enriquecidas (código, nombre, costo promedio, importe).
func ApplyWarehouseToUnitTransfer(snap *StoreSnapshot, unitID string, lines []TransferLineInput) ([]TransferLine, error) {
	if err := ValidateTransferStock(snap, unitID, AggregateTransferDemand(lines)); err != nil {
		return nil, err
	}
	out := make([]TransferLine, 0, len(lines))
	for _, in := range lines {
		pid := strings.TrimSpace(in.ProductID)
		p := snap.Products[pid]
		st := snap.WarehouseStock[pid]
		if p == nil || st == nil {
			return nil, &TransferValidationError{
				Code:    "product_invalid",
				Message: "producto o stock de almacén inconsistente",
				Product: pid,
			}
		}
		qty := in.Qty
		unitCost := st.AvgCost
		amount := qty * unitCost

		st.Qty -= qty
		if st.Qty < 0 {
			// No debería ocurrir tras validación; rollback no es trivial en-place:
			// re-validamos para no dejar negativos.
			st.Qty += qty
			return nil, &TransferValidationError{
				Code:    "stock_insufficient",
				Message: fmt.Sprintf("stock insuficiente de %s durante aplicación", p.Code),
				Product: p.Code,
			}
		}
		st.AmountBase = st.Qty * st.AvgCost

		// Destino PDV
		var us *UnitStock
		for i := range snap.UnitStocks {
			if snap.UnitStocks[i].UnitID == unitID && snap.UnitStocks[i].ProductID == pid {
				us = &snap.UnitStocks[i]
				break
			}
		}
		if us == nil {
			snap.UnitStocks = append(snap.UnitStocks, UnitStock{
				UnitID: unitID, ProductID: pid, Qty: qty, AvgCost: unitCost, AmountBase: amount,
			})
		} else {
			nq := us.Qty + qty
			if nq > 0 {
				us.AvgCost = (us.AmountBase + amount) / nq
			}
			us.Qty = nq
			us.AmountBase = us.Qty * us.AvgCost
		}

		out = append(out, TransferLine{
			ProductID:   pid,
			ProductCode: p.Code,
			ProductName: p.Name,
			Qty:         qty,
			UnitCost:    unitCost,
			Amount:      amount,
		})
	}
	return out, nil
}
