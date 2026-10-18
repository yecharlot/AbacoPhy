/**
 * AOS-ERP — grafo 3D ligero (proyección perspectiva en canvas 2D).
 * Sin Three.js: órbita + zoom, tamaño de canvas fijo (no se colapsa).
 */
import {
  CATEGORIES,
  ZYRION,
  flowLabel,
  nodeDisplayColor,
  quantStats,
  zyrionColor,
  zyrionLabel,
  buildGraphFromState,
  demoGraph,
  filterGraph,
  neighborhood,
  sealGraphOps,
  getChainTip,
} from '../../domain/aos-erp.js';

const MAX_VISIBLE_OPS = 48;
const CANVAS_H = 480; // altura fija CSS — evita el bucle de reducción

export async function renderAosErp(el, eng) {
  const state = eng.state || {};
  const tenantName = state.tenant?.name || 'Delicias en Ruta';
  let raw;
  try {
    raw = buildGraphFromState(state);
    if (!raw.nodes.filter((n) => !n.isActor && !n.isNucleus).length) {
      raw = demoGraph(tenantName);
    }
    try {
      raw.nodes = await sealGraphOps(raw.nodes);
    } catch (sealErr) {
      console.warn('AOS-ERP seal skipped', sealErr);
    }
  } catch (buildErr) {
    console.warn('AOS-ERP build fallback demo', buildErr);
    raw = demoGraph(tenantName);
  }
  raw.nodes = (raw.nodes || []).filter((n) => n.id !== 'nucleus');
  raw.nodes.unshift({
    id: 'nucleus',
    label: tenantName,
    type: 'nucleus',
    category: 'caja',
    amount: 0,
    zyrion: ZYRION.SUCCESS,
    isNucleus: true,
    dateLabel: '—',
    detail: 'Núcleo del negocio',
  });
  if (!raw.edges) raw.edges = [];
  if (!raw.edges) raw.edges = [];
  // Cada operación → núcleo (sin nodos de saldo/cuenta)
  const hubEdges = raw.nodes
    .filter((n) => !n.isNucleus && !n.isActor)
    .map((n) => ({ from: 'nucleus', to: n.id }));
  raw.edges = [...raw.edges.filter((e) => !String(e.from).startsWith('actor:') && !String(e.to).startsWith('actor:')), ...hubEdges];


  let category = 'all';
  let zFilter = 'all';
  let flowFilter = 'all';
  let datePreset = 'all';
  let dateFrom = '';
  let dateTo = '';
  let selected = null;
  let focusMode = false;
  let showAll = false;

  // Cámara 3D (órbita)
  let rotY = 0.35;
  let rotX = 0.25;
  let distance = 520;
  let panX = 0;
  let panY = 0;

  // Posiciones 3D locales (esfera alrededor del núcleo)
  const pos3 = new Map();
  // Proyectadas 2D + profundidad
  const pos2 = new Map();

  let viewW = 800;
  let dragging = false;
  let dragMode = 'orbit'; // orbit | pan
  let lastX = 0;
  let lastY = 0;
  let moved = false;
  let raf = 0;
  let needDraw = true;

  el.innerHTML = `
    <div class="aos-erp">
      <div class="aos-erp-toolbar card">
        <div class="aos-erp-title">
          <h3 style="margin:0">AOS-ERP · Salud del negocio</h3>
          <p class="muted" style="margin:4px 0 0">
            <span class="aos-legend-n"></span> Núcleo ·
            <b style="color:#22c55e">verde</b> entra $ ·
            <b style="color:#f97316">naranja</b> sale $ (compras, impuestos, gastos) ·
            <b style="color:#dc2626">rojo fuerte</b> pérdida/fallo ·
            <b style="color:#94a3b8">gris</b> pendiente.
            <br/>Relleno = dinero; borde claro = operación OK. Nodos = operaciones (nombre). Montos solo al hacer clic. Arrastrar = 3D · Shift = pan · rueda = zoom.
          </p>
        </div>
        <div class="aos-erp-filters">
          <label>Categoría<select id="aos-cat" class="input"></select></label>
          <label>Estado op.
            <select id="aos-z" class="input">
              <option value="all">Todos</option>
              <option value="1">OK</option>
              <option value="0">Fallida</option>
              <option value="2">Pendiente</option>
            </select>
          </label>
          <label>Flujo $
            <select id="aos-flow" class="input">
              <option value="all">Todo flujo</option>
              <option value="in">Entra dinero</option>
              <option value="out">Sale dinero</option>
              <option value="loss">Pérdidas</option>
            </select>
          </label>
          <label>Fecha
            <select id="aos-date-preset" class="input">
              <option value="all">Todo el tiempo</option>
              <option value="last10">Últimas 10</option>
              <option value="last30">Últimas 30</option>
              <option value="today">Hoy</option>
              <option value="month">Mes actual</option>
              <option value="prev_month">Mes anterior</option>
              <option value="range">Rango…</option>
            </select>
          </label>
          <label class="aos-range" id="aos-range-wrap" style="display:none">Desde
            <input type="date" id="aos-date-from" class="input"/>
          </label>
          <label class="aos-range" id="aos-range-wrap2" style="display:none">Hasta
            <input type="date" id="aos-date-to" class="input"/>
          </label>
          <button type="button" class="btn" id="aos-zoom-in">＋</button>
          <button type="button" class="btn" id="aos-zoom-out">－</button>
          <button type="button" class="btn" id="aos-reset-cam">Centrar</button>
          <button type="button" class="btn" id="aos-reset">Vista completa</button>
          <button type="button" class="btn" id="aos-show-all">Mostrar todas</button>
        </div>
        <div class="aos-erp-stats muted" id="aos-stats"></div>
      </div>
      <div class="aos-erp-body">
        <div class="aos-canvas-wrap" id="aos-wrap">
          <canvas id="aos-canvas"></canvas>
        </div>
        <aside class="aos-erp-detail card" id="aos-detail">
          <h4>Detalle</h4>
          <p class="muted">Arrastra el grafo para orbitar en 3D. Clic en un nodo para ver detalle.</p>
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

  const wrap = el.querySelector('#aos-wrap');
  const canvas = el.querySelector('#aos-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const detail = el.querySelector('#aos-detail');
  const stats = el.querySelector('#aos-stats');
  const chainEl = el.querySelector('#aos-chain');

  /** Tamaño de canvas: solo desde el wrap, altura FIJA — no se reduce sola */
  function syncCanvasSize() {
    const w = Math.max(320, Math.floor(wrap.clientWidth || 800));
    const h = CANVAS_H;
    if (w === viewW && canvas.width === w * (window.devicePixelRatio || 1)) return false;
    viewW = w;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }

  function applyLod(graph) {
    const ops = graph.nodes.filter((n) => !n.isActor && !n.isNucleus && !n.isCluster);
    if (showAll || ops.length <= MAX_VISIBLE_OPS) return graph;
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
      (byCat[c] = byCat[c] || []).push(n);
    });
    const nodes = graph.nodes.filter((n) => n.isNucleus || n.isActor || keep.has(n.id));
    const edges = [];
    Object.keys(byCat).forEach((c) => {
      const list = byCat[c];
      if (!list.length) return;
      const id = `cluster:${c}`;
      const fail = list.some((x) => x.zyrion === 0);
      const pend = list.some((x) => x.zyrion === 2);
      nodes.push({
        id,
        label: `${c} (+${list.length})`,
        type: 'cluster',
        category: c,
        amount: list.reduce((s, x) => s + (x.amount || 0), 0),
        zyrion: fail ? 0 : pend ? 2 : 1,
        isCluster: true,
        members: list.map((x) => x.id),
      });
      edges.push({ from: 'nucleus', to: id });
    });
    keep.forEach((id) => edges.push({ from: 'nucleus', to: id }));
    graph.edges.forEach((e) => {
      if (keep.has(e.from) && keep.has(e.to)) edges.push(e);
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
    let g = filterGraph(raw, {
      category, zyrionFilter: zFilter, flowFilter,
      datePreset, dateFrom, dateTo,
    });
    if (!g.nodes.some((n) => n.isNucleus)) {
      const nuc = raw.nodes.find((n) => n.isNucleus);
      if (nuc) g.nodes = [nuc, ...g.nodes];
    }
    if (focusMode && selected) {
      g = neighborhood(g, selected);
      const nuc = raw.nodes.find((n) => n.isNucleus);
      if (nuc && !g.nodes.some((n) => n.isNucleus)) g.nodes.push(nuc);
    } else {
      g = applyLod(g);
    }
    return g;
  }

  /** Coordenadas 3D en esfera (estable por id) */
  function layout3D(nodes) {
    pos3.clear();
    pos3.set('nucleus', { x: 0, y: 0, z: 0, r: 22 });
    const others = nodes.filter((n) => !n.isNucleus);
    const n = Math.max(others.length, 1);
    others.forEach((node, i) => {
      // distribución tipo Fibonacci sphere
      const t = i / n;
      const y = 1 - 2 * t;
      const radius = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = Math.PI * (3 - Math.sqrt(5)) * i;
      let R = 160;
      if (node.isActor) R = 120;
      if (node.isCluster) R = 200;
      pos3.set(node.id, {
        x: Math.cos(theta) * radius * R,
        y: y * R * 0.85,
        z: Math.sin(theta) * radius * R,
        r: node.isCluster ? 16 : node.isActor ? 9 : 11,
      });
    });
  }

  function project(px, py, pz) {
    // rotación Y luego X
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const cosX = Math.cos(rotX);
    const sinX = Math.sin(rotX);
    let x = px * cosY - pz * sinY;
    let z = px * sinY + pz * cosY;
    let y = py * cosX - z * sinX;
    z = py * sinX + z * cosX;
    // perspectiva
    const fov = distance;
    const depth = fov + z;
    const f = fov / Math.max(80, depth);
    const cx = viewW / 2 + panX;
    const cy = CANVAS_H / 2 + panY;
    return { x: cx + x * f, y: cy + y * f, z, f };
  }

  function scheduleDraw() {
    needDraw = true;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (needDraw) {
        needDraw = false;
        paint();
      }
    });
  }

  function paint() {
    if (!canvas || !ctx || !wrap) return;
    try {
    syncCanvasSize();
    const g = currentGraph();
    layout3D(g.nodes);

    const w = viewW;
    const h = CANVAS_H;
    // fondo (sin depender de altura variable)
    const grd = ctx.createRadialGradient(w / 2, h / 2, 30, w / 2, h / 2, Math.max(w, h));
    grd.addColorStop(0, '#152a40');
    grd.addColorStop(1, '#0a1018');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);

    pos2.clear();
    const projected = [];
    g.nodes.forEach((n) => {
      const p = pos3.get(n.id);
      if (!p) return;
      const pr = project(p.x, p.y, p.z);
      const rad = Math.max(4, p.r * pr.f);
      pos2.set(n.id, { x: pr.x, y: pr.y, z: pr.z, r: rad, f: pr.f });
      projected.push({ n, pr, rad });
    });

    // aristas (detrás)
    g.edges.forEach((e) => {
      const a = pos2.get(e.from);
      const b = pos2.get(e.to);
      if (!a || !b) return;
      const hi = selected && (e.from === selected || e.to === selected);
      ctx.beginPath();
      ctx.strokeStyle = hi ? 'rgba(244,180,0,0.9)' : 'rgba(100,116,139,0.4)';
      ctx.lineWidth = hi ? 2 : 1;
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    });

    // nodos de atrás hacia adelante
    projected.sort((a, b) => a.pr.z - b.pr.z);
    projected.forEach(({ n, pr, rad }) => {
      const col = nodeDisplayColor(n);
      if (n.isNucleus || selected === n.id) {
        ctx.beginPath();
        ctx.fillStyle = n.isNucleus ? 'rgba(244,180,0,0.22)' : 'rgba(255,255,255,0.1)';
        ctx.arc(pr.x, pr.y, rad + 8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.fillStyle = col;
      ctx.arc(pr.x, pr.y, rad, 0, Math.PI * 2);
      ctx.fill();
      // Borde = Zyrion (estado operativo), distinto del relleno económico
      if (n.isNucleus) {
        ctx.strokeStyle = '#fff8e0';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      } else if (!n.isActor) {
        ctx.strokeStyle = selected === n.id ? '#f4b400' : zyrionColor(n.zyrion);
        ctx.lineWidth = selected === n.id ? 3 : 2;
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(226,232,240,0.95)';
      ctx.font = '11px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(opLabel(n), pr.x, pr.y + rad + 12);
    });

    const q = quantStats(g.nodes);
    const lodNote = g.lod ? ` · LOD ${g.hidden} agrupadas` : '';
    const catBits = Object.entries(q.byCategory)
      .sort((a,b)=>b[1]-a[1])
      .slice(0, 6)
      .map(([k,v]) => `${k}:${v}`)
      .join(' · ');
    stats.innerHTML = `Ops <b>${q.total}</b> ·
      <span style="color:#22c55e">+entra ${q.byFlow.in||0} (${q.sumIn})</span> ·
      <span style="color:#f97316">−sale ${q.byFlow.out||0} (${q.sumOut})</span> ·
      <span style="color:#dc2626">pérdida ${q.byFlow.loss||0} (${q.sumLoss})</span>
      <span class="muted"> · OK ${q.byZyrion.ok} / fallidas ${q.byZyrion.fail} / pend. ${q.byZyrion.pending}</span>
      ${catBits ? `<br/><span class="muted">Por tipo: ${catBits}</span>` : ''}${lodNote}`;
    const tip = getChainTip();
    if (chainEl) chainEl.textContent = tip ? `Cadena · ${tip.hash.slice(0, 16)}…` : 'Cadena AOS-ERP';
    } catch (paintErr) {
      console.error('AOS-ERP paint', paintErr);
      if (stats) stats.textContent = 'Error al dibujar el grafo: ' + (paintErr.message || paintErr);
    }
  }

  function showDetail(n) {
    if (!n) {
      detail.innerHTML = `<h4>Detalle</h4><p class="muted">Clic en un nodo. Arrastra para orbitar.</p>`;
      return;
    }
    if (n.isCluster) {
      detail.innerHTML = `<h4>Grupo ${escapeHtml(n.category)}</h4>
        <p>${n.members?.length || 0} operaciones (LOD). Usa «Mostrar todas» o filtra.</p>`;
      return;
    }
    const g = neighborhood(raw, n.id);
    const deps = g.nodes.filter((x) => x.id !== n.id);
    detail.innerHTML = `
      <h4>${escapeHtml(n.label || n.id)}</h4>
      <p>
        <span class="badge" style="background:${n.isNucleus ? '#f4b400' : nodeDisplayColor(n)};color:#111">
          ${n.isNucleus ? 'Núcleo' : flowLabel(n.flow)}</span>
        ${n.isNucleus ? '' : `<span class="badge" style="background:#1e293b;color:${zyrionColor(n.zyrion)};border:1px solid ${zyrionColor(n.zyrion)};margin-left:6px">${zyrionLabel(n.zyrion)}</span>`}
      </p>
      <dl class="aos-dl">
        <dt>Fecha</dt><dd>${escapeHtml(n.dateLabel || n.dateIso || '—')}</dd>
        <dt>Detalle</dt><dd>${escapeHtml(n.detail || n.label || '—')}</dd>
        <dt>Tipo</dt><dd>${escapeHtml(n.type || '—')}</dd>
        <dt>Categoría</dt><dd>${escapeHtml(n.category || '—')}</dd>
        <dt>Flujo $</dt><dd>${escapeHtml(flowLabel(n.flow))}</dd>
        <dt>Monto / saldo op.</dt><dd><b>${n.amount != null && n.amount !== '' ? `${n.amount} ${n.currency || ''}` : '—'}</b></dd>
        <dt>Desde</dt><dd>${escapeHtml(n.from || '—')}</dd>
        <dt>Hacia</dt><dd>${escapeHtml(n.to || '—')}</dd>
        <dt>Cuenta</dt><dd>${escapeHtml(n.accountCode || '—')}</dd>
        <dt>Hash</dt><dd class="mono">${escapeHtml(String(n.hash || '—').slice(0, 24))}</dd>
      </dl>
      <h5>Conexiones (${deps.length})</h5>
      <ul class="aos-deps">
        ${deps.map((d) => `<li><button type="button" data-go="${d.id}" class="linkish">${escapeHtml(d.label)}</button></li>`).join('') || '<li class="muted">—</li>'}
      </ul>
      ${n.isNucleus ? '' : '<button type="button" class="btn btn-primary" id="aos-focus">Solo conexiones</button>'}`;
    detail.querySelector('#aos-focus')?.addEventListener('click', () => {
      focusMode = true;
      scheduleDraw();
    });
    detail.querySelectorAll('[data-go]').forEach((b) => {
      b.addEventListener('click', () => {
        selected = b.getAttribute('data-go');
        showDetail(raw.nodes.find((x) => x.id === selected));
        scheduleDraw();
      });
    });
  }

  function hitTest(sx, sy) {
    let best = null;
    let bestZ = -Infinity;
    pos2.forEach((p, id) => {
      const dx = sx - p.x;
      const dy = sy - p.y;
      if (dx * dx + dy * dy <= (p.r + 6) * (p.r + 6) && p.z >= bestZ) {
        bestZ = p.z;
        best = id;
      }
    });
    if (!best) return null;
    return currentGraph().nodes.find((n) => n.id === best) || raw.nodes.find((n) => n.id === best);
  }

  canvas.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    distance = Math.min(1200, Math.max(220, distance + ev.deltaY * 0.35));
    scheduleDraw();
  }, { passive: false });

  canvas.addEventListener('mousedown', (ev) => {
    if (ev.button !== 0) return;
    dragging = true;
    moved = false;
    dragMode = ev.shiftKey ? 'pan' : 'orbit';
    lastX = ev.clientX;
    lastY = ev.clientY;
  });
  window.addEventListener('mouseup', () => { dragging = false; });
  window.addEventListener('mousemove', (ev) => {
    if (!dragging) return;
    const dx = ev.clientX - lastX;
    const dy = ev.clientY - lastY;
    if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
    lastX = ev.clientX;
    lastY = ev.clientY;
    if (dragMode === 'pan') {
      panX += dx;
      panY += dy;
    } else {
      rotY += dx * 0.01;
      rotX = Math.max(-1.2, Math.min(1.2, rotX + dy * 0.01));
    }
    scheduleDraw();
  });

  canvas.addEventListener('click', (ev) => {
    if (moved) return;
    const rect = canvas.getBoundingClientRect();
    const sx = ev.clientX - rect.left;
    const sy = ev.clientY - rect.top;
    const n = hitTest(sx, sy);
    selected = n ? n.id : null;
    showDetail(n);
    scheduleDraw();
  });

  // touch: un dedo órbita
  canvas.addEventListener('touchstart', (ev) => {
    if (ev.touches.length === 1) {
      dragging = true;
      moved = false;
      dragMode = 'orbit';
      lastX = ev.touches[0].clientX;
      lastY = ev.touches[0].clientY;
    }
  }, { passive: true });
  canvas.addEventListener('touchmove', (ev) => {
    if (!dragging || ev.touches.length !== 1) return;
    const dx = ev.touches[0].clientX - lastX;
    const dy = ev.touches[0].clientY - lastY;
    if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
    lastX = ev.touches[0].clientX;
    lastY = ev.touches[0].clientY;
    rotY += dx * 0.012;
    rotX = Math.max(-1.2, Math.min(1.2, rotX + dy * 0.012));
    scheduleDraw();
  }, { passive: true });
  canvas.addEventListener('touchend', () => { dragging = false; });

  function refreshFilters() {
    focusMode = false;
    scheduleDraw();
  }
  catSel.onchange = () => { category = catSel.value; refreshFilters(); };
  el.querySelector('#aos-z').onchange = (e) => { zFilter = e.target.value; refreshFilters(); };
  el.querySelector('#aos-flow').onchange = (e) => { flowFilter = e.target.value; refreshFilters(); };
  const presetEl = el.querySelector('#aos-date-preset');
  const range1 = el.querySelector('#aos-range-wrap');
  const range2 = el.querySelector('#aos-range-wrap2');
  function toggleRange() {
    const show = presetEl.value === 'range';
    if (range1) range1.style.display = show ? '' : 'none';
    if (range2) range2.style.display = show ? '' : 'none';
  }
  if (presetEl) {
    presetEl.onchange = () => {
      datePreset = presetEl.value;
      toggleRange();
      refreshFilters();
    };
  }
  el.querySelector('#aos-date-from')?.addEventListener('change', (e) => {
    dateFrom = e.target.value; datePreset = 'range'; if (presetEl) presetEl.value = 'range'; toggleRange(); refreshFilters();
  });
  el.querySelector('#aos-date-to')?.addEventListener('change', (e) => {
    dateTo = e.target.value; datePreset = 'range'; if (presetEl) presetEl.value = 'range'; toggleRange(); refreshFilters();
  });
  el.querySelector('#aos-zoom-in').onclick = () => { distance = Math.max(220, distance - 40); scheduleDraw(); };
  el.querySelector('#aos-zoom-out').onclick = () => { distance = Math.min(1200, distance + 40); scheduleDraw(); };
  el.querySelector('#aos-reset-cam').onclick = () => {
    rotX = 0.25; rotY = 0.35; distance = 520; panX = 0; panY = 0; scheduleDraw();
  };
  el.querySelector('#aos-reset').onclick = () => {
    focusMode = false; selected = null; category = 'all'; zFilter = 'all'; flowFilter = 'all';
    datePreset = 'all'; dateFrom = ''; dateTo = ''; showAll = false;
    catSel.value = 'all';
    el.querySelector('#aos-z').value = 'all';
    el.querySelector('#aos-flow').value = 'all';
    if (el.querySelector('#aos-date-preset')) el.querySelector('#aos-date-preset').value = 'all';
    if (el.querySelector('#aos-date-from')) el.querySelector('#aos-date-from').value = '';
    if (el.querySelector('#aos-date-to')) el.querySelector('#aos-date-to').value = '';
    const r1 = el.querySelector('#aos-range-wrap'); const r2 = el.querySelector('#aos-range-wrap2');
    if (r1) r1.style.display = 'none'; if (r2) r2.style.display = 'none';
    rotX = 0.25; rotY = 0.35; distance = 520; panX = 0; panY = 0;
    showDetail(null); scheduleDraw();
  };
  el.querySelector('#aos-show-all').onclick = () => {
    showAll = !showAll;
    el.querySelector('#aos-show-all').textContent = showAll ? 'Agrupar (LOD)' : 'Mostrar todas';
    scheduleDraw();
  };

  // Resize: solo si cambia el ancho del wrap (altura fija)
  let lastWrapW = 0;
  const ro = new ResizeObserver(() => {
    const w = Math.floor(wrap.clientWidth || 0);
    if (Math.abs(w - lastWrapW) < 2) return;
    lastWrapW = w;
    scheduleDraw();
  });
  ro.observe(wrap);

  scheduleDraw();
}

/** Nombre identificable de la operación — sin montos ni saldos en el grafo */
function opLabel(n) {
  if (!n || n.isNucleus) return (n && n.label) || 'Negocio';
  if (n.isCluster) return (n.label || '').slice(0, 24);
  let s = String(n.label || n.type || n.id || 'Op').trim();
  // quitar cifras sueltas tipo montos pegados al nombre
  s = s.replace(/\s*[\$€]?\s*\d+[\d.,]*\s*(CUP|USD|EUR)?\s*$/i, '').trim();
  if (s.length > 24) s = s.slice(0, 22) + '…';
  return s || 'Operación';
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
