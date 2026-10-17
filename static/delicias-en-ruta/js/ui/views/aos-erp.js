/**
 * Panel AOS-ERP — grafo de salud del negocio (Zyrion 0/1/2).
 */
import {
  CATEGORIES,
  ZYRION,
  zyrionColor,
  zyrionLabel,
  buildGraphFromState,
  demoGraph,
  filterGraph,
  neighborhood,
  sealGraphOps,
  getChainTip,
} from '../../domain/aos-erp.js';

export async function renderAosErp(el, eng) {
  const state = eng.state || {};
  let raw = buildGraphFromState(state);
  if (raw.nodes.filter((n) => !n.isActor).length === 0) {
    raw = demoGraph(state.tenant?.name || 'Delicias en Ruta');
  }
  // Sellar nodos de operación (cadena local inmutable)
  raw.nodes = await sealGraphOps(raw.nodes);

  let category = 'all';
  let zFilter = 'all';
  let selected = null;
  let focusMode = false;
  const pos = new Map();

  el.innerHTML = `
    <div class="aos-erp">
      <div class="aos-erp-toolbar card">
        <div class="aos-erp-title">
          <h3 style="margin:0">AOS-ERP · Salud del negocio</h3>
          <p class="muted" style="margin:4px 0 0">Nodos: <b style="color:#22c55e">verde</b> éxito ·
            <b style="color:#ef4444">rojo</b> fallo/pérdida ·
            <b style="color:#94a3b8">gris</b> pendiente. Clic = detalle y conexiones.</p>
        </div>
        <div class="aos-erp-filters">
          <label>Categoría
            <select id="aos-cat" class="input"></select>
          </label>
          <label>Estado
            <select id="aos-z" class="input">
              <option value="all">Todos</option>
              <option value="1">Éxito (verde)</option>
              <option value="0">Fallo (rojo)</option>
              <option value="2">Pendiente (gris)</option>
            </select>
          </label>
          <button type="button" class="btn" id="aos-reset">Vista completa</button>
        </div>
        <div class="aos-erp-stats muted" id="aos-stats"></div>
      </div>
      <div class="aos-erp-body">
        <canvas id="aos-canvas" width="800" height="480"></canvas>
        <aside class="aos-erp-detail card" id="aos-detail">
          <h4>Detalle</h4>
          <p class="muted">Selecciona un nodo del grafo.</p>
        </aside>
      </div>
      <div class="aos-erp-foot muted" id="aos-chain"></div>
    </div>`;

  const catSel = el.querySelector('#aos-cat');
  CATEGORIES.forEach((c) => {
    const o = document.createElement('option');
    o.value = c.id;
    o.textContent = c.label;
    catSel.appendChild(o);
  });

  const canvas = el.querySelector('#aos-canvas');
  const ctx = canvas.getContext('2d');
  const detail = el.querySelector('#aos-detail');
  const stats = el.querySelector('#aos-stats');
  const chainEl = el.querySelector('#aos-chain');

  function layout(nodes) {
    const w = canvas.clientWidth || 800;
    const h = canvas.clientHeight || 480;
    canvas.width = w;
    canvas.height = h;
    const ops = nodes.filter((n) => !n.isActor);
    const actors = nodes.filter((n) => n.isActor);
    const cx = w / 2;
    const cy = h / 2;
    ops.forEach((n, i) => {
      const ang = (i / Math.max(ops.length, 1)) * Math.PI * 2 - Math.PI / 2;
      const r = Math.min(w, h) * 0.32;
      pos.set(n.id, {
        x: cx + Math.cos(ang) * r,
        y: cy + Math.sin(ang) * r,
        r: n.zyrion === ZYRION.FAILURE ? 16 : 14,
      });
    });
    actors.forEach((n, i) => {
      const ang = (i / Math.max(actors.length, 1)) * Math.PI * 2;
      const r = Math.min(w, h) * 0.42;
      pos.set(n.id, { x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r, r: 11 });
    });
  }

  function currentGraph() {
    let g = filterGraph(raw, category, zFilter);
    if (focusMode && selected) g = neighborhood(g, selected);
    return g;
  }

  function draw() {
    const g = currentGraph();
    layout(g.nodes);
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    // fondo sutil
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // edges
    g.edges.forEach((e) => {
      const a = pos.get(e.from);
      const b = pos.get(e.to);
      if (!a || !b) return;
      const hi = selected && (e.from === selected || e.to === selected);
      ctx.beginPath();
      ctx.strokeStyle = hi ? '#f4b400' : '#334155';
      ctx.lineWidth = hi ? 2.5 : 1.2;
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    });

    // nodes
    g.nodes.forEach((n) => {
      const p = pos.get(n.id);
      if (!p) return;
      const col = n.isActor ? '#64748b' : zyrionColor(n.zyrion);
      ctx.beginPath();
      ctx.fillStyle = col;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      if (selected === n.id) {
        ctx.strokeStyle = '#f4b400';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '11px system-ui,sans-serif';
      ctx.textAlign = 'center';
      const label = (n.label || n.id).slice(0, 22);
      ctx.fillText(label, p.x, p.y + p.r + 12);
    });

    const ops = g.nodes.filter((n) => !n.isActor);
    const c1 = ops.filter((n) => n.zyrion === 1).length;
    const c0 = ops.filter((n) => n.zyrion === 0).length;
    const c2 = ops.filter((n) => n.zyrion === 2).length;
    stats.innerHTML = `Operaciones: <b>${ops.length}</b> ·
      <span style="color:#22c55e">éxito ${c1}</span> ·
      <span style="color:#ef4444">fallo ${c0}</span> ·
      <span style="color:#94a3b8">pendiente ${c2}</span>`;

    const tip = getChainTip();
    chainEl.textContent = tip
      ? `Cadena AOS-ERP · último hash: ${tip.hash.slice(0, 16)}… · nodos sellados: ver localStorage`
      : 'Cadena AOS-ERP vacía';
  }

  function showDetail(n) {
    if (!n) {
      detail.innerHTML = `<h4>Detalle</h4><p class="muted">Selecciona un nodo del grafo.</p>`;
      return;
    }
    const g = neighborhood(raw, n.id);
    const deps = g.nodes.filter((x) => x.id !== n.id);
    detail.innerHTML = `
      <h4>${escapeHtml(n.label || n.id)}</h4>
      <p><span class="badge" style="background:${zyrionColor(n.zyrion)};color:#111">${zyrionLabel(n.zyrion)}</span></p>
      <dl class="aos-dl">
        <dt>Tipo</dt><dd>${escapeHtml(n.type || '—')}</dd>
        <dt>Categoría</dt><dd>${escapeHtml(n.category || '—')}</dd>
        <dt>Monto</dt><dd>${n.amount ? `${n.amount} ${n.currency || ''}` : '—'}</dd>
        <dt>Desde</dt><dd>${escapeHtml(n.from || '—')}</dd>
        <dt>Hacia</dt><dd>${escapeHtml(n.to || '—')}</dd>
        <dt>Hash</dt><dd class="mono">${escapeHtml((n.hash || '—').slice(0, 24))}${(n.hash && n.hash.length > 24) ? '…' : ''}</dd>
        <dt>Prev</dt><dd class="mono">${escapeHtml((n.prev || '—').toString().slice(0, 16))}</dd>
      </dl>
      <h5>Conexiones (${deps.length})</h5>
      <ul class="aos-deps">
        ${deps.map((d) => `<li><button type="button" data-go="${d.id}" class="linkish">${escapeHtml(d.label)}</button>
          <span class="dot" style="background:${zyrionColor(d.zyrion)}"></span></li>`).join('') || '<li class="muted">Sin conexiones</li>'}
      </ul>
      <button type="button" class="btn btn-primary" id="aos-focus">Ver solo conexiones</button>
    `;
    detail.querySelector('#aos-focus')?.addEventListener('click', () => {
      focusMode = true;
      draw();
    });
    detail.querySelectorAll('[data-go]').forEach((b) => {
      b.addEventListener('click', () => {
        selected = b.getAttribute('data-go');
        const nn = raw.nodes.find((x) => x.id === selected);
        showDetail(nn);
        draw();
      });
    });
  }

  function hitTest(x, y) {
    const g = currentGraph();
    for (let i = g.nodes.length - 1; i >= 0; i--) {
      const n = g.nodes[i];
      const p = pos.get(n.id);
      if (!p) continue;
      const dx = x - p.x;
      const dy = y - p.y;
      if (dx * dx + dy * dy <= (p.r + 4) * (p.r + 4)) return n;
    }
    return null;
  }

  canvas.addEventListener('click', (ev) => {
    const rect = canvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left) * (canvas.width / rect.width);
    const y = (ev.clientY - rect.top) * (canvas.height / rect.height);
    const n = hitTest(x, y);
    selected = n ? n.id : null;
    showDetail(n);
    draw();
  });

  catSel.addEventListener('change', () => {
    category = catSel.value;
    focusMode = false;
    draw();
  });
  el.querySelector('#aos-z').addEventListener('change', (e) => {
    zFilter = e.target.value;
    focusMode = false;
    draw();
  });
  el.querySelector('#aos-reset').addEventListener('click', () => {
    focusMode = false;
    selected = null;
    category = 'all';
    zFilter = 'all';
    catSel.value = 'all';
    el.querySelector('#aos-z').value = 'all';
    showDetail(null);
    draw();
  });

  // resize
  const ro = new ResizeObserver(() => draw());
  ro.observe(el.querySelector('.aos-erp-body') || el);

  draw();
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
