/**
 * AOS-ERP — grafo 3D ligero (proyección perspectiva en canvas 2D).
 * Sin Three.js: órbita + zoom, tamaño de canvas fijo (no se colapsa).
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

const MAX_VISIBLE_OPS = 48;
const CANVAS_H = 480; // altura fija CSS — evita el bucle de reducción

export async function renderAosErp(el, eng) {
  const state = eng.state || {};
  const tenantName = state.tenant?.name || 'Delicias en Ruta';
  let raw = buildGraphFromState(state);
  if (raw.nodes.filter((n) => !n.isActor).length === 0) {
    raw = demoGraph(tenantName);
  }
  raw.nodes = await sealGraphOps(raw.nodes);
  raw.nodes = raw.nodes.filter((n) => n.id !== 'nucleus');
  raw.nodes.unshift({
    id: 'nucleus',
    label: tenantName,
    type: 'nucleus',
    category: 'caja',
    amount: 0,
    zyrion: ZYRION.SUCCESS,
    isNucleus: true,
  });
  const extraEdges = [];
  raw.nodes.forEach((n) => {
    if (n.isActor && /caja|central/i.test(n.label || '')) {
      extraEdges.push({ from: 'nucleus', to: n.id });
    }
  });
  raw.edges = [...raw.edges, ...extraEdges];

  let category = 'all';
  let zFilter = 'all';
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
            <b style="color:#22c55e">verde</b> éxito ·
            <b style="color:#ef4444">rojo</b> fallo ·
            <b style="color:#94a3b8">gris</b> pendiente.
            Arrastrar = rotar 3D · Shift+arrastrar = desplazar · Rueda = zoom.
          </p>
        </div>
        <div class="aos-erp-filters">
          <label>Categoría<select id="aos-cat" class="input"></select></label>
          <label>Estado
            <select id="aos-z" class="input">
              <option value="all">Todos</option>
              <option value="1">Éxito</option>
              <option value="0">Fallo</option>
              <option value="2">Pendiente</option>
            </select>
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
    let g = filterGraph(raw, category, zFilter);
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
      let col = zyrionColor(n.zyrion);
      if (n.isNucleus) col = '#f4b400';
      else if (n.isActor) col = '#64748b';
      else if (n.isCluster) col = n.zyrion === 0 ? '#f87171' : n.zyrion === 2 ? '#94a3b8' : '#38bdf8';

      if (n.isNucleus || selected === n.id) {
        ctx.beginPath();
        ctx.fillStyle = n.isNucleus ? 'rgba(244,180,0,0.2)' : 'rgba(255,255,255,0.1)';
        ctx.arc(pr.x, pr.y, rad + 8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.fillStyle = col;
      ctx.arc(pr.x, pr.y, rad, 0, Math.PI * 2);
      ctx.fill();
      if (n.isNucleus) {
        ctx.strokeStyle = '#fff8e0';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      } else if (selected === n.id) {
        ctx.strokeStyle = '#f4b400';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(226,232,240,0.95)';
      ctx.font = '11px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText((n.label || '').slice(0, 22), pr.x, pr.y + rad + 12);
    });

    const ops = g.nodes.filter((n) => !n.isActor && !n.isNucleus);
    const lodNote = g.lod ? ` · LOD ${g.hidden} agrupadas` : '';
    stats.innerHTML = `3D · dist ${Math.round(distance)} · ops <b>${ops.length}</b> ·
      <span style="color:#22c55e">${ops.filter((n) => n.zyrion === 1).length}</span>/
      <span style="color:#ef4444">${ops.filter((n) => n.zyrion === 0).length}</span>/
      <span style="color:#94a3b8">${ops.filter((n) => n.zyrion === 2).length}</span>${lodNote}`;
    const tip = getChainTip();
    chainEl.textContent = tip ? `Cadena · ${tip.hash.slice(0, 16)}…` : 'Cadena AOS-ERP';
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
      <p><span class="badge" style="background:${n.isNucleus ? '#f4b400' : zyrionColor(n.zyrion)};color:#111">
        ${n.isNucleus ? 'Núcleo' : zyrionLabel(n.zyrion)}</span></p>
      <dl class="aos-dl">
        <dt>Tipo</dt><dd>${escapeHtml(n.type || '—')}</dd>
        <dt>Categoría</dt><dd>${escapeHtml(n.category || '—')}</dd>
        <dt>Monto</dt><dd>${n.amount ? `${n.amount} ${n.currency || ''}` : '—'}</dd>
        <dt>Desde</dt><dd>${escapeHtml(n.from || '—')}</dd>
        <dt>Hacia</dt><dd>${escapeHtml(n.to || '—')}</dd>
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

  catSel.onchange = () => { category = catSel.value; focusMode = false; scheduleDraw(); };
  el.querySelector('#aos-z').onchange = (e) => { zFilter = e.target.value; focusMode = false; scheduleDraw(); };
  el.querySelector('#aos-zoom-in').onclick = () => { distance = Math.max(220, distance - 40); scheduleDraw(); };
  el.querySelector('#aos-zoom-out').onclick = () => { distance = Math.min(1200, distance + 40); scheduleDraw(); };
  el.querySelector('#aos-reset-cam').onclick = () => {
    rotX = 0.25; rotY = 0.35; distance = 520; panX = 0; panY = 0; scheduleDraw();
  };
  el.querySelector('#aos-reset').onclick = () => {
    focusMode = false; selected = null; category = 'all'; zFilter = 'all'; showAll = false;
    catSel.value = 'all'; el.querySelector('#aos-z').value = 'all';
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

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
