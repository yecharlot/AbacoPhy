/**
 * Panel AOS-ERP — grafo de salud (núcleo del negocio, zoom/pan, LOD).
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

const MAX_VISIBLE_OPS = 48; // plan anti-crecimiento: agrupar el resto

export async function renderAosErp(el, eng) {
  const state = eng.state || {};
  const tenantName = state.tenant?.name || 'Delicias en Ruta';
  let raw = buildGraphFromState(state);
  if (raw.nodes.filter((n) => !n.isActor).length === 0) {
    raw = demoGraph(tenantName);
  }
  raw.nodes = await sealGraphOps(raw.nodes);
  // Núcleo del negocio (siempre)
  raw.nodes = raw.nodes.filter((n) => n.id !== 'nucleus');
  raw.nodes.unshift({
    id: 'nucleus',
    label: tenantName,
    type: 'nucleus',
    category: 'caja',
    amount: 0,
    zyrion: ZYRION.SUCCESS,
    isNucleus: true,
    from: '',
    to: '',
    at: 0,
  });
  // Conectar actores/ops relevantes al núcleo
  const extraEdges = [];
  raw.nodes.forEach((n) => {
    if (n.isNucleus) return;
    if (n.isActor && /caja|central|tenant|negocio/i.test(n.label || '')) {
      extraEdges.push({ from: 'nucleus', to: n.id });
    }
    if (!n.isActor && (n.zyrion === 1 || n.category === 'ingreso' || n.category === 'venta')) {
      // no conectar todas: solo se verán en layout radial
    }
  });
  raw.edges = [...raw.edges, ...extraEdges];

  let category = 'all';
  let zFilter = 'all';
  let selected = null;
  let focusMode = false;
  let showAll = false;

  // cámara
  let scale = 1;
  let panX = 0;
  let panY = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  const pos = new Map();

  el.innerHTML = `
    <div class="aos-erp">
      <div class="aos-erp-toolbar card">
        <div class="aos-erp-title">
          <h3 style="margin:0">AOS-ERP · Salud del negocio</h3>
          <p class="muted" style="margin:4px 0 0">
            <span class="aos-legend-n"></span> Núcleo (negocio) ·
            <b style="color:#22c55e">verde</b> éxito ·
            <b style="color:#ef4444">rojo</b> fallo ·
            <b style="color:#94a3b8">gris</b> pendiente.
            Rueda = zoom · arrastrar fondo = pan · clic nodo = detalle.
          </p>
        </div>
        <div class="aos-erp-filters">
          <label>Categoría
            <select id="aos-cat" class="input"></select>
          </label>
          <label>Estado
            <select id="aos-z" class="input">
              <option value="all">Todos</option>
              <option value="1">Éxito</option>
              <option value="0">Fallo</option>
              <option value="2">Pendiente</option>
            </select>
          </label>
          <button type="button" class="btn" id="aos-zoom-in" title="Zoom +">＋</button>
          <button type="button" class="btn" id="aos-zoom-out" title="Zoom −">－</button>
          <button type="button" class="btn" id="aos-reset-cam">Centrar</button>
          <button type="button" class="btn" id="aos-reset">Vista completa</button>
          <button type="button" class="btn" id="aos-show-all" title="Si hay muchas ops, muestra todas">Mostrar todas</button>
        </div>
        <div class="aos-erp-stats muted" id="aos-stats"></div>
      </div>
      <div class="aos-erp-body">
        <div class="aos-canvas-wrap">
          <canvas id="aos-canvas" width="900" height="520"></canvas>
        </div>
        <aside class="aos-erp-detail card" id="aos-detail">
          <h4>Detalle</h4>
          <p class="muted">Selecciona un nodo. El centro es el núcleo del negocio.</p>
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

  function applyLod(graph) {
    const ops = graph.nodes.filter((n) => !n.isActor && !n.isNucleus && !n.isCluster);
    if (showAll || ops.length <= MAX_VISIBLE_OPS) return graph;

    // Priorizar fallos y pendientes; el resto se agrupa por categoría
    const priority = [];
    const rest = [];
    ops.forEach((n) => {
      if (n.zyrion === 0 || n.zyrion === 2) priority.push(n);
      else rest.push(n);
    });
    priority.sort((a, b) => (b.at || 0) - (a.at || 0));
    rest.sort((a, b) => (b.at || 0) - (a.at || 0));
    const keep = new Set();
    [...priority, ...rest].slice(0, MAX_VISIBLE_OPS).forEach((n) => keep.add(n.id));

    const byCat = {};
    ops.forEach((n) => {
      if (keep.has(n.id)) return;
      const c = n.category || 'otro';
      if (!byCat[c]) byCat[c] = [];
      byCat[c].push(n);
    });

    const nodes = graph.nodes.filter((n) => n.isNucleus || n.isActor || keep.has(n.id));
    const edges = [];
    Object.keys(byCat).forEach((c) => {
      const list = byCat[c];
      if (!list.length) return;
      const id = `cluster:${c}`;
      const fail = list.filter((x) => x.zyrion === 0).length;
      const pend = list.filter((x) => x.zyrion === 2).length;
      let z = 1;
      if (fail) z = 0;
      else if (pend) z = 2;
      nodes.push({
        id,
        label: `${c} (+${list.length})`,
        type: 'cluster',
        category: c,
        amount: list.reduce((s, x) => s + (x.amount || 0), 0),
        zyrion: z,
        isCluster: true,
        members: list.map((x) => x.id),
        from: '',
        to: '',
        at: Date.now(),
      });
      edges.push({ from: 'nucleus', to: id });
    });
    keep.forEach((id) => edges.push({ from: 'nucleus', to: id }));
    graph.edges.forEach((e) => {
      if (keep.has(e.from) && keep.has(e.to)) edges.push(e);
      if ((e.from === 'nucleus' || e.to === 'nucleus') && (keep.has(e.from) || keep.has(e.to))) edges.push(e);
    });
    const ids = new Set(nodes.map((n) => n.id));
    return {
      nodes,
      edges: edges.filter((e) => ids.has(e.from) && ids.has(e.to)),
      lod: true,
      hidden: ops.length - keep.size,
    };
  }

  function currentGraph() {
    let g = filterGraph(raw, category, zFilter);
    // asegurar núcleo
    if (!g.nodes.some((n) => n.isNucleus)) {
      g.nodes = [raw.nodes.find((n) => n.isNucleus), ...g.nodes].filter(Boolean);
    }
    if (focusMode && selected) {
      g = neighborhood(g, selected);
      if (!g.nodes.some((n) => n.id === 'nucleus') && raw.nodes.some((n) => n.isNucleus)) {
        g.nodes.push(raw.nodes.find((n) => n.isNucleus));
      }
    } else {
      g = applyLod(g);
    }
    return g;
  }

  function layout(nodes) {
    const w = canvas.clientWidth || 900;
    const h = canvas.clientHeight || 520;
    canvas.width = w * (window.devicePixelRatio || 1);
    canvas.height = h * (window.devicePixelRatio || 1);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);

    const cx = w / 2;
    const cy = h / 2;
    pos.clear();
    pos.set('nucleus', { x: cx, y: cy, r: 28 });

    const others = nodes.filter((n) => !n.isNucleus);
    const rings = { actor: 0.22, cluster: 0.34, op: 0.4 };
    others.forEach((n, i) => {
      const kind = n.isActor ? 'actor' : n.isCluster ? 'cluster' : 'op';
      const base = rings[kind] || 0.4;
      const ang = (i / Math.max(others.length, 1)) * Math.PI * 2 - Math.PI / 2;
      // ligera variación de radio para que no se solapen
      const jitter = 0.06 * Math.sin(i * 2.3);
      const r = Math.min(w, h) * (base + jitter);
      let rad = 12;
      if (n.isCluster) rad = 18;
      if (n.isActor) rad = 10;
      if (n.zyrion === 0) rad += 2;
      pos.set(n.id, {
        x: cx + Math.cos(ang) * r,
        y: cy + Math.sin(ang) * r,
        r: rad,
      });
    });
  }

  function worldFromScreen(sx, sy) {
    const w = canvas.clientWidth || 900;
    const h = canvas.clientHeight || 520;
    return {
      x: (sx - w / 2 - panX) / scale + w / 2,
      y: (sy - h / 2 - panY) / scale + h / 2,
    };
  }

  function draw() {
    const g = currentGraph();
    layout(g.nodes);
    const w = canvas.clientWidth || 900;
    const h = canvas.clientHeight || 520;

    ctx.save();
    ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
    // fondo
    const grd = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, Math.max(w, h) * 0.7);
    grd.addColorStop(0, '#132337');
    grd.addColorStop(1, '#0b1220');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);

    // cámara
    ctx.translate(w / 2 + panX, h / 2 + panY);
    ctx.scale(scale, scale);
    ctx.translate(-w / 2, -h / 2);

    // aristas
    g.edges.forEach((e) => {
      const a = pos.get(e.from);
      const b = pos.get(e.to);
      if (!a || !b) return;
      const hi = selected && (e.from === selected || e.to === selected);
      ctx.beginPath();
      ctx.strokeStyle = hi ? 'rgba(244,180,0,0.85)' : 'rgba(100,116,139,0.45)';
      ctx.lineWidth = hi ? 2.2 / scale : 1 / scale;
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    });

    // nodos
    g.nodes.forEach((n) => {
      const p = pos.get(n.id);
      if (!p) return;
      let col = zyrionColor(n.zyrion);
      if (n.isNucleus) col = '#f4b400';
      else if (n.isActor) col = '#64748b';
      else if (n.isCluster) col = n.zyrion === 0 ? '#f87171' : n.zyrion === 2 ? '#94a3b8' : '#38bdf8';

      // glow
      if (n.isNucleus || n.zyrion === 0 || selected === n.id) {
        ctx.beginPath();
        ctx.fillStyle = n.isNucleus ? 'rgba(244,180,0,0.25)' : 'rgba(255,255,255,0.08)';
        ctx.arc(p.x, p.y, p.r + 10, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.beginPath();
      ctx.fillStyle = col;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();

      if (n.isNucleus) {
        ctx.strokeStyle = '#fff7d6';
        ctx.lineWidth = 3 / scale;
        ctx.stroke();
      } else if (selected === n.id) {
        ctx.strokeStyle = '#f4b400';
        ctx.lineWidth = 3 / scale;
        ctx.stroke();
      }

      ctx.fillStyle = '#e2e8f0';
      ctx.font = `${Math.max(10, 11 / Math.sqrt(scale))}px system-ui,sans-serif`;
      ctx.textAlign = 'center';
      const label = (n.label || n.id).slice(0, 26);
      ctx.fillText(label, p.x, p.y + p.r + 12);
    });

    ctx.restore();

    const ops = g.nodes.filter((n) => !n.isActor && !n.isNucleus);
    const c1 = ops.filter((n) => n.zyrion === 1).length;
    const c0 = ops.filter((n) => n.zyrion === 0).length;
    const c2 = ops.filter((n) => n.zyrion === 2).length;
    const lodNote = g.lod ? ` · <i>LOD: ${g.hidden} ops agrupadas</i>` : '';
    stats.innerHTML = `Zoom ${Math.round(scale * 100)}% · Ops visibles <b>${ops.length}</b> ·
      <span style="color:#22c55e">${c1}</span> /
      <span style="color:#ef4444">${c0}</span> /
      <span style="color:#94a3b8">${c2}</span>${lodNote}`;

    const tip = getChainTip();
    chainEl.textContent = tip
      ? `Cadena AOS-ERP · hash ${tip.hash.slice(0, 18)}…`
      : 'Cadena AOS-ERP';
  }

  function showDetail(n) {
    if (!n) {
      detail.innerHTML = `<h4>Detalle</h4><p class="muted">Selecciona un nodo. El centro dorado es el núcleo del negocio.</p>`;
      return;
    }
    if (n.isCluster) {
      detail.innerHTML = `
        <h4>Grupo: ${escapeHtml(n.category)}</h4>
        <p>${n.members?.length || 0} operaciones agrupadas (LOD).</p>
        <p class="muted">Pulsa «Mostrar todas» o filtra por categoría para ver nodos individuales.</p>
        <p>Monto acum.: <b>${n.amount || 0}</b></p>
        <p>${zyrionLabel(n.zyrion)}</p>`;
      return;
    }
    const g = neighborhood(raw, n.id);
    const deps = g.nodes.filter((x) => x.id !== n.id);
    detail.innerHTML = `
      <h4>${escapeHtml(n.label || n.id)}</h4>
      <p><span class="badge" style="background:${n.isNucleus ? '#f4b400' : zyrionColor(n.zyrion)};color:#111">
        ${n.isNucleus ? 'Núcleo del negocio' : zyrionLabel(n.zyrion)}</span></p>
      <dl class="aos-dl">
        <dt>Tipo</dt><dd>${escapeHtml(n.type || '—')}</dd>
        <dt>Categoría</dt><dd>${escapeHtml(n.category || '—')}</dd>
        <dt>Monto</dt><dd>${n.amount ? `${n.amount} ${n.currency || ''}` : '—'}</dd>
        <dt>Desde</dt><dd>${escapeHtml(n.from || '—')}</dd>
        <dt>Hacia</dt><dd>${escapeHtml(n.to || '—')}</dd>
        <dt>Hash</dt><dd class="mono">${escapeHtml((n.hash || '—').toString().slice(0, 28))}</dd>
      </dl>
      <h5>Conexiones (${deps.length})</h5>
      <ul class="aos-deps">
        ${deps.map((d) => `<li><button type="button" data-go="${d.id}" class="linkish">${escapeHtml(d.label)}</button>
          <span class="dot" style="background:${d.isNucleus ? '#f4b400' : zyrionColor(d.zyrion)}"></span></li>`).join('') || '<li class="muted">—</li>'}
      </ul>
      ${n.isNucleus ? '' : '<button type="button" class="btn btn-primary" id="aos-focus">Ver solo conexiones</button>'}
    `;
    detail.querySelector('#aos-focus')?.addEventListener('click', () => {
      focusMode = true;
      draw();
    });
    detail.querySelectorAll('[data-go]').forEach((b) => {
      b.addEventListener('click', () => {
        selected = b.getAttribute('data-go');
        showDetail(raw.nodes.find((x) => x.id === selected) || currentGraph().nodes.find((x) => x.id === selected));
        draw();
      });
    });
  }

  function hitTest(sx, sy) {
    const { x, y } = worldFromScreen(sx, sy);
    const g = currentGraph();
    for (let i = g.nodes.length - 1; i >= 0; i--) {
      const n = g.nodes[i];
      const p = pos.get(n.id);
      if (!p) continue;
      const dx = x - p.x;
      const dy = y - p.y;
      if (dx * dx + dy * dy <= (p.r + 6) * (p.r + 6)) return n;
    }
    return null;
  }

  canvas.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    const factor = ev.deltaY < 0 ? 1.12 : 0.89;
    scale = Math.min(4, Math.max(0.25, scale * factor));
    draw();
  }, { passive: false });

  canvas.addEventListener('mousedown', (ev) => {
    if (ev.button !== 0) return;
    dragging = true;
    lastX = ev.clientX;
    lastY = ev.clientY;
  });
  window.addEventListener('mouseup', () => { dragging = false; });
  window.addEventListener('mousemove', (ev) => {
    if (!dragging) return;
    panX += ev.clientX - lastX;
    panY += ev.clientY - lastY;
    lastX = ev.clientX;
    lastY = ev.clientY;
    draw();
  });

  canvas.addEventListener('click', (ev) => {
    if (Math.abs(ev.clientX - lastX) > 4) return;
    const rect = canvas.getBoundingClientRect();
    const sx = ev.clientX - rect.left;
    const sy = ev.clientY - rect.top;
    const n = hitTest(sx, sy);
    selected = n ? n.id : null;
    showDetail(n);
    draw();
  });

  // touch pan
  let touchMode = null;
  canvas.addEventListener('touchstart', (ev) => {
    if (ev.touches.length === 1) {
      touchMode = 'pan';
      lastX = ev.touches[0].clientX;
      lastY = ev.touches[0].clientY;
    }
  }, { passive: true });
  canvas.addEventListener('touchmove', (ev) => {
    if (touchMode === 'pan' && ev.touches.length === 1) {
      panX += ev.touches[0].clientX - lastX;
      panY += ev.touches[0].clientY - lastY;
      lastX = ev.touches[0].clientX;
      lastY = ev.touches[0].clientY;
      draw();
    }
  }, { passive: true });
  canvas.addEventListener('touchend', () => { touchMode = null; });

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
  el.querySelector('#aos-zoom-in').onclick = () => { scale = Math.min(4, scale * 1.2); draw(); };
  el.querySelector('#aos-zoom-out').onclick = () => { scale = Math.max(0.25, scale / 1.2); draw(); };
  el.querySelector('#aos-reset-cam').onclick = () => { scale = 1; panX = 0; panY = 0; draw(); };
  el.querySelector('#aos-reset').onclick = () => {
    focusMode = false;
    selected = null;
    category = 'all';
    zFilter = 'all';
    showAll = false;
    catSel.value = 'all';
    el.querySelector('#aos-z').value = 'all';
    scale = 1; panX = 0; panY = 0;
    showDetail(null);
    draw();
  };
  el.querySelector('#aos-show-all').onclick = () => {
    showAll = !showAll;
    el.querySelector('#aos-show-all').textContent = showAll ? 'Agrupar (LOD)' : 'Mostrar todas';
    draw();
  };

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
