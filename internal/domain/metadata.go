package domain

func (t *Tenant) GetMetadata() Metadata          { return t.Metadata }
func (t *Tenant) SetMetadata(m Metadata)         { t.Metadata = m }
func (u *User) GetMetadata() Metadata            { return u.Metadata }
func (u *User) SetMetadata(m Metadata)           { u.Metadata = m }
func (a *Account) GetMetadata() Metadata         { return a.Metadata }
func (a *Account) SetMetadata(m Metadata)        { a.Metadata = m }
func (e *Entry) GetMetadata() Metadata           { return e.Metadata }
func (e *Entry) SetMetadata(m Metadata)          { e.Metadata = m }
func (i *InventoryItem) GetMetadata() Metadata   { return i.Metadata }
func (i *InventoryItem) SetMetadata(m Metadata)  { i.Metadata = m }
func (m *InventoryMove) GetMetadata() Metadata   { return m.Metadata }
func (m *InventoryMove) SetMetadata(md Metadata) { m.Metadata = md }
func (e *Employee) GetMetadata() Metadata        { return e.Metadata }
func (e *Employee) SetMetadata(m Metadata)       { e.Metadata = m }
func (p *Payslip) GetMetadata() Metadata         { return p.Metadata }
func (p *Payslip) SetMetadata(m Metadata)        { p.Metadata = m }
func (inv *Invoice) GetMetadata() Metadata       { return inv.Metadata }
func (inv *Invoice) SetMetadata(m Metadata)      { inv.Metadata = m }
func (ae *AuditEntry) GetMetadata() Metadata     { return ae.Metadata }
func (ae *AuditEntry) SetMetadata(m Metadata)    { ae.Metadata = m }
func (p *Product) GetMetadata() Metadata         { return p.Metadata }
func (p *Product) SetMetadata(m Metadata)        { p.Metadata = m }
func (r *ReceptionNote) GetMetadata() Metadata   { return r.Metadata }
func (r *ReceptionNote) SetMetadata(m Metadata)  { r.Metadata = m }
func (s *StockTransfer) GetMetadata() Metadata   { return s.Metadata }
func (s *StockTransfer) SetMetadata(m Metadata)  { s.Metadata = m }
func (s *POSSale) GetMetadata() Metadata         { return s.Metadata }
func (s *POSSale) SetMetadata(m Metadata)        { s.Metadata = m }
func (c *CostSheet) GetMetadata() Metadata       { return c.Metadata }
func (c *CostSheet) SetMetadata(m Metadata)      { c.Metadata = m }
func (o *OnlineOrder) GetMetadata() Metadata     { return o.Metadata }
func (o *OnlineOrder) SetMetadata(m Metadata)    { o.Metadata = m }
