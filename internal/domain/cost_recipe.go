package domain

// DefaultDifficultyFactor maps UX difficulty level (1–5) to a multiplier.
// Configurable later via tenant metadata; not assumed immutable by callers.
func DefaultDifficultyFactor(level int) float64 {
	switch {
	case level <= 0:
		return 1.0
	case level == 1:
		return 1.0
	case level == 2:
		return 1.1
	case level == 3:
		return 1.25
	case level == 4:
		return 1.5
	default:
		return 1.8 // 5+
	}
}

// ProductUnitCost returns the current unit cost used in recipes:
// 1) warehouse avg_cost  2) any unit stock avg_cost  3) cost sheet costo_unitario  4) cost_std
func ProductUnitCost(snap *StoreSnapshot, productID string) float64 {
	if snap == nil || productID == "" {
		return 0
	}
	if st := snap.WarehouseStock[productID]; st != nil && st.AvgCost > 0 {
		return st.AvgCost
	}
	for i := range snap.UnitStocks {
		if snap.UnitStocks[i].ProductID == productID && snap.UnitStocks[i].AvgCost > 0 {
			return snap.UnitStocks[i].AvgCost
		}
	}
	if cs := snap.CostSheets[productID]; cs != nil && cs.CostoUnitario > 0 {
		return cs.CostoUnitario
	}
	if p := snap.Products[productID]; p != nil && p.CostStd > 0 {
		return p.CostStd
	}
	return 0
}

// CostSheetWouldCycle reports whether adding edges productID → each component
// would introduce a cycle in the composition graph (including existing sheets).
func CostSheetWouldCycle(snap *StoreSnapshot, productID string, componentIDs []string) bool {
	if snap == nil || productID == "" {
		return false
	}
	// Build adjacency: composite → component product ids
	adj := map[string][]string{}
	for pid, cs := range snap.CostSheets {
		if cs == nil {
			continue
		}
		for _, c := range cs.Components {
			if c.ProductID != "" {
				adj[pid] = append(adj[pid], c.ProductID)
			}
		}
	}
	adj[productID] = append([]string{}, componentIDs...)

	// DFS from productID looking for a path back to productID
	var visit func(string, map[string]bool) bool
	visit = func(node string, stack map[string]bool) bool {
		if stack[node] {
			return true
		}
		stack[node] = true
		for _, next := range adj[node] {
			if visit(next, stack) {
				return true
			}
		}
		delete(stack, node)
		return false
	}
	return visit(productID, map[string]bool{})
}

// RecalculateCostSheet applies the recipe (or legacy sum) and fills
// MaterialCost, LaborCost, CostoUnitario, component line costs.
// Does not persist; caller assigns UpdatedAt and Store.Put.
func RecalculateCostSheet(snap *StoreSnapshot, sheet *CostSheet) {
	if sheet == nil {
		return
	}
	prev := sheet.CostoUnitario
	if len(sheet.Components) > 0 {
		var mat float64
		for i := range sheet.Components {
			c := &sheet.Components[i]
			if p := snap.Products[c.ProductID]; p != nil {
				c.ProductCode, c.ProductName = p.Code, p.Name
			}
			uc := ProductUnitCost(snap, c.ProductID)
			c.UnitCost = uc
			c.LineCost = uc * c.Qty
			mat += c.LineCost
		}
		sheet.MaterialCost = mat
		factor := sheet.DifficultyFactor
		if factor <= 0 {
			factor = DefaultDifficultyFactor(sheet.DifficultyLevel)
			sheet.DifficultyFactor = factor
		}
		rate := sheet.LaborBaseRate
		// LaborMinutes × rate × factor (rate = cost per minute)
		sheet.LaborCost = rate * sheet.LaborMinutes * factor
		// Legacy rubros: materia prima refleja materiales de receta
		sheet.MateriaPrima = mat
		sheet.SalarioDirecto = sheet.LaborCost
		sheet.CostoUnitario = mat + sheet.LaborCost +
			sheet.MatAuxiliares + sheet.Energia + sheet.OtrosDirectos + sheet.GastosIndirectos
	} else {
		sheet.CostoUnitario = sheet.MateriaPrima + sheet.MatAuxiliares + sheet.Energia +
			sheet.SalarioDirecto + sheet.OtrosDirectos + sheet.GastosIndirectos
		sheet.MaterialCost = sheet.MateriaPrima
		sheet.LaborCost = sheet.SalarioDirecto
	}
	if sheet.PrecioSugerido <= 0 && sheet.CostoUnitario > 0 {
		sheet.PrecioSugerido = sheet.CostoUnitario * 1.3
	}
	// Historial de variación: conservar costo anterior cuando el unitario cambia
	if prev > 0 && sheet.CostoUnitario != prev {
		sheet.PreviousCostoUnitario = prev
	}
}

// CostSheetDependents returns product IDs whose cost-sheet recipe lists productID as a component.
// Used to block deletion of a sheet that other composites depend on.
func CostSheetDependents(snap *StoreSnapshot, productID string) []string {
	return sheetsDependingOn(snap, productID)
}

// sheetsDependingOn returns product IDs whose cost sheet lists productID as component.
func sheetsDependingOn(snap *StoreSnapshot, productID string) []string {
	var out []string
	if snap == nil {
		return out
	}
	for pid, cs := range snap.CostSheets {
		if cs == nil {
			continue
		}
		for _, c := range cs.Components {
			if c.ProductID == productID {
				out = append(out, pid)
				break
			}
		}
	}
	return out
}

// PropagateCostFromProduct recalculates all cost sheets that depend on productID
// (direct or indirect), in a BFS order from the changed product outward.
// Updates product.CostStd for each recalculated composite.
func PropagateCostFromProduct(snap *StoreSnapshot, productID string) int {
	if snap == nil || productID == "" {
		return 0
	}
	seen := map[string]bool{}
	queue := sheetsDependingOn(snap, productID)
	n := 0
	for len(queue) > 0 {
		pid := queue[0]
		queue = queue[1:]
		if seen[pid] {
			continue
		}
		seen[pid] = true
		cs := snap.CostSheets[pid]
		if cs == nil {
			continue
		}
		RecalculateCostSheet(snap, cs)
		if p := snap.Products[pid]; p != nil {
			p.CostStd = cs.CostoUnitario
		}
		n++
		for _, dep := range sheetsDependingOn(snap, pid) {
			if !seen[dep] {
				queue = append(queue, dep)
			}
		}
	}
	return n
}
