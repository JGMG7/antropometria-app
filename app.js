(() => {
  'use strict';

  const STORAGE_KEY = 'antropometria_sujetos_v1';

  /* ---------- storage ---------- */

  function loadSubjects() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('No se pudo leer el almacenamiento local', e);
      return [];
    }
  }

  function saveSubjects(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  let subjects = loadSubjects();
  let editingId = null;

  /* ---------- calculations ---------- */

  function calcEdad(nacimiento, fecha) {
    const nac = new Date(nacimiento);
    const ev = new Date(fecha);
    const days = (ev - nac) / (1000 * 60 * 60 * 24);
    return days / 365;
  }

  function computeAll(s) {
    const edad = calcEdad(s.nacimiento, s.fecha);
    const imc = s.peso / ((s.talla / 100) ** 2);
    const s6pl = s.trc + s.ssc + s.ssp + s.abd + s.mmed + s.pant;
    const s3plCorr = (s.trc + s.ssc + s.ssp) * 170.18 / s.talla;
    const hwr = s.talla / Math.pow(s.peso, 0.3333);

    const pctGrasa = s.sexo === 'F'
      ? 7.9 + 0.213 * (s.trc + s.ssc + s.ssp + s.abd)
      : 5.783 + 0.153 * (s.trc + s.ssc + s.ssp + s.abd);

    const pesoGraso = s.peso * pctGrasa / 100;
    // Von Döbeln, modificada por Rocha (1974): usa talla² (no húmero), muñeca y fémur.
    const pesoOseo = 3.02 * Math.pow(
      (s.talla / 100) ** 2 * (s.muneca / 100) * (s.femur / 100) * 400,
      0.712
    );
    // Würch: 24.1% en hombres, 20.9% en mujeres (De Rose & Guimarães, 1980).
    const pesoResidual = s.peso * (s.sexo === 'M' ? 0.241 : 0.209);
    const pesoMuscular = s.peso - (pesoGraso + pesoOseo + pesoResidual);

    const endo = -0.7182 + 0.1451 * s3plCorr - 0.00068 * s3plCorr ** 2 + 0.0000014 * s3plCorr ** 3;
    const meso = 0.858 * s.humero + 0.601 * s.femur
      + 0.188 * (s.brCont - (s.trc / 10))
      + 0.161 * (s.pantMed - (s.pant / 10))
      - (s.talla * 0.131) + 4.5;
    const ecto = hwr >= 40.75 ? 0.732 * hwr - 28.58
      : hwr > 38.25 ? 0.463 * hwr - 17.63
      : 0.1;

    const x = ecto - endo;
    const y = 2 * meso - (endo + ecto);

    return { edad, imc, s6pl, s3plCorr, hwr, pctGrasa, pesoGraso, pesoOseo, pesoResidual, pesoMuscular, endo, meso, ecto, x, y };
  }

  /* ---------- formatting ---------- */

  const fmt = (n, d = 1) => Number.isFinite(n) ? n.toFixed(d) : '—';

  /* ---------- form ---------- */

  const form = document.getElementById('subjectForm');
  const saveBtn = document.getElementById('saveBtn');
  const clearBtn = document.getElementById('clearBtn');
  const resultsCard = document.getElementById('resultsCard');
  const resultsGrid = document.getElementById('resultsGrid');

  const NUMERIC_FIELDS = ['peso', 'talla', 'muneca', 'humero', 'femur', 'cbz', 'brRel', 'brCont',
    'cintura', 'cadera', 'musAnt', 'pantMed', 'trc', 'ssc', 'ssp', 'abd', 'mmed', 'pant'];

  function readForm() {
    const fd = new FormData(form);
    const raw = { nombre: fd.get('nombre').trim(), sexo: fd.get('sexo'), nacimiento: fd.get('nacimiento'), fecha: fd.get('fecha') };
    for (const f of NUMERIC_FIELDS) raw[f] = parseFloat(fd.get(f));
    return raw;
  }

  function fillForm(s) {
    for (const [k, v] of Object.entries(s)) {
      const el = form.elements[k];
      if (el) el.value = v;
    }
  }

  function resetForm() {
    form.reset();
    const today = new Date().toISOString().slice(0, 10);
    form.elements['fecha'].value = today;
    editingId = null;
    saveBtn.textContent = 'Calcular y guardar';
    resultsCard.hidden = true;
  }

  function showResults(s, r) {
    resultsCard.hidden = false;
    const tiles = [
      ['Edad', fmt(r.edad, 1) + ' a'],
      ['IMC', fmt(r.imc)],
      ['Suma 6 pliegues', fmt(r.s6pl) + ' mm'],
      ['% Grasa', fmt(r.pctGrasa) + ' %'],
      ['Peso graso', fmt(r.pesoGraso) + ' kg'],
      ['Peso óseo', fmt(r.pesoOseo) + ' kg'],
      ['Peso muscular', fmt(r.pesoMuscular) + ' kg'],
      ['Peso residual', fmt(r.pesoResidual) + ' kg'],
      ['Endomorfia', fmt(r.endo, 2)],
      ['Mesomorfia', fmt(r.meso, 2)],
      ['Ectomorfia', fmt(r.ecto, 2)],
      ['Coordenadas (X, Y)', `${fmt(r.x, 2)}, ${fmt(r.y, 2)}`],
    ];
    resultsGrid.innerHTML = tiles.map(([label, value]) => `
      <div class="result-tile">
        <div class="result-tile__label">${label}</div>
        <div class="result-tile__value">${value}</div>
      </div>`).join('');
    resultsCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;

    const raw = readForm();
    const r = computeAll(raw);

    if (editingId) {
      const idx = subjects.findIndex(s => s.id === editingId);
      if (idx !== -1) subjects[idx] = { ...subjects[idx], ...raw };
    } else {
      subjects.push({ id: crypto.randomUUID(), ...raw, createdAt: Date.now() });
    }
    saveSubjects(subjects);
    showResults(raw, r);
    renderSubjects();
    renderStats();
    renderChart();
    toast(editingId ? 'Sujeto actualizado' : 'Sujeto guardado');
    resetForm();
  });

  clearBtn.addEventListener('click', resetForm);

  /* ---------- subjects table ---------- */

  const subjectsBody = document.getElementById('subjectsBody');
  const subjectsEmptyHint = document.getElementById('subjectsEmptyHint');
  const subjectsTable = document.getElementById('subjectsTable');

  function renderSubjects() {
    const has = subjects.length > 0;
    subjectsTable.hidden = !has;
    subjectsEmptyHint.hidden = has;
    subjectsBody.innerHTML = subjects.map(s => {
      const r = computeAll(s);
      return `<tr data-id="${s.id}">
        <td>${escapeHtml(s.nombre)}</td>
        <td>${s.sexo}</td>
        <td>${fmt(r.edad, 1)}</td>
        <td>${fmt(r.imc)}</td>
        <td>${fmt(r.pctGrasa)}</td>
        <td>${fmt(r.endo, 2)}</td>
        <td>${fmt(r.meso, 2)}</td>
        <td>${fmt(r.ecto, 2)}</td>
        <td class="no-print">
          <button class="btn--icon" data-action="print" title="Imprimir / PDF">🖨️</button>
          <button class="btn--icon" data-action="edit" title="Editar">✏️</button>
          <button class="btn--icon" data-action="delete" title="Eliminar">🗑️</button>
        </td>
      </tr>`;
    }).join('');
  }

  subjectsBody.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const tr = btn.closest('tr');
    const id = tr.dataset.id;
    if (btn.dataset.action === 'print') {
      printSubject(id);
    } else if (btn.dataset.action === 'edit') {
      const s = subjects.find(s => s.id === id);
      if (!s) return;
      editingId = id;
      fillForm(s);
      saveBtn.textContent = 'Actualizar sujeto';
      resultsCard.hidden = true;
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (btn.dataset.action === 'delete') {
      const s = subjects.find(s => s.id === id);
      if (!s) return;
      if (!confirm(`¿Eliminar a "${s.nombre}"?`)) return;
      subjects = subjects.filter(s => s.id !== id);
      saveSubjects(subjects);
      renderSubjects();
      renderStats();
      renderChart();
      toast('Sujeto eliminado');
    }
  });

  document.getElementById('clearAllBtn').addEventListener('click', () => {
    if (subjects.length === 0) return;
    if (!confirm('¿Borrar todos los sujetos guardados? Esta acción no se puede deshacer.')) return;
    subjects = [];
    saveSubjects(subjects);
    renderSubjects();
    renderStats();
    renderChart();
    toast('Se borraron todos los sujetos');
  });

  /* ---------- CSV export ---------- */

  document.getElementById('exportBtn').addEventListener('click', () => {
    if (subjects.length === 0) { toast('No hay sujetos para exportar'); return; }
    const headers = ['nombre', 'sexo', 'nacimiento', 'fecha', 'peso', 'talla', 'edad', 'imc',
      'suma6pliegues', 'pctGrasa', 'pesoGraso', 'pesoOseo', 'pesoMuscular', 'pesoResidual',
      'endomorfia', 'mesomorfia', 'ectomorfia', 'x', 'y'];
    const rows = subjects.map(s => {
      const r = computeAll(s);
      return [s.nombre, s.sexo, s.nacimiento, s.fecha, s.peso, s.talla, r.edad.toFixed(2), r.imc.toFixed(2),
        r.s6pl.toFixed(1), r.pctGrasa.toFixed(2), r.pesoGraso.toFixed(2), r.pesoOseo.toFixed(2),
        r.pesoMuscular.toFixed(2), r.pesoResidual.toFixed(2), r.endo.toFixed(2), r.meso.toFixed(2),
        r.ecto.toFixed(2), r.x.toFixed(2), r.y.toFixed(2)];
    });
    const csv = [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'antropometria.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  function csvCell(v) {
    const s = String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ---------- print / PDF ---------- */

  const FIELD_GROUPS = [
    ['Básicos', [['peso', 'Peso (kg)'], ['talla', 'Talla (cm)']]],
    ['Diámetros (cm)', [['muneca', 'Muñeca'], ['humero', 'Húmero'], ['femur', 'Fémur']]],
    ['Perímetros (cm)', [['cbz', 'CBZ'], ['brRel', 'Br. relajado'], ['brCont', 'Br. contraído'],
      ['cintura', 'Cintura'], ['cadera', 'Cadera'], ['musAnt', 'Muslo anterior'], ['pantMed', 'Pantorrilla medial']]],
    ['Pliegues (mm)', [['trc', 'TRC'], ['ssc', 'SSC'], ['ssp', 'SSP'], ['abd', 'ABD'], ['mmed', 'MMED'], ['pant', 'PANT']]],
  ];

  function todayEs() {
    return new Date().toLocaleDateString('es-UY', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function buildIndividualReportHTML(s, r) {
    const dataRows = FIELD_GROUPS.map(([title, fields]) => `
      <tr><th colspan="${fields.length}" class="print-group-head">${title}</th></tr>
      <tr>${fields.map(([, label]) => `<th>${label}</th>`).join('')}</tr>
      <tr>${fields.map(([key]) => `<td>${fmt(s[key], 1)}</td>`).join('')}</tr>
    `).join('');

    const resultRows = [
      ['Edad', fmt(r.edad, 1) + ' años'],
      ['IMC', fmt(r.imc)],
      ['Suma 6 pliegues', fmt(r.s6pl) + ' mm'],
      ['% Grasa', fmt(r.pctGrasa) + ' %'],
      ['Peso graso', fmt(r.pesoGraso) + ' kg'],
      ['Peso óseo', fmt(r.pesoOseo) + ' kg'],
      ['Peso muscular', fmt(r.pesoMuscular) + ' kg'],
      ['Peso residual', fmt(r.pesoResidual) + ' kg'],
      ['Endomorfia', fmt(r.endo, 2)],
      ['Mesomorfia', fmt(r.meso, 2)],
      ['Ectomorfia', fmt(r.ecto, 2)],
      ['Coordenadas (X, Y)', `${fmt(r.x, 2)}, ${fmt(r.y, 2)}`],
    ];

    return `
      <h1>Informe individual — ${escapeHtml(s.nombre)}</h1>
      <p class="print-meta">Sexo: ${s.sexo === 'F' ? 'Femenino' : 'Masculino'} · Nacimiento: ${s.nacimiento} · Evaluación: ${s.fecha} · Generado: ${todayEs()}</p>
      <h2>Datos ingresados</h2>
      <table class="print-table">${dataRows}</table>
      <h2>Resultados</h2>
      <table class="print-table print-results">
        ${resultRows.map(([label, value]) => `<tr><th>${label}</th><td>${value}</td></tr>`).join('')}
      </table>
      <p class="print-footer">Antropometría — Composición corporal y somatotipo (Heath-Carter). Grupo de Investigación Biofísica y Bioquímica del Ejercicio, ISEF‑CURE.</p>
    `;
  }

  const printIndividualCard = document.getElementById('printIndividualCard');

  function printSubject(id) {
    const s = subjects.find(x => x.id === id);
    if (!s) return;
    const r = computeAll(s);
    printIndividualCard.innerHTML = buildIndividualReportHTML(s, r);
    document.body.classList.add('print-individual');
    window.print();
  }

  window.addEventListener('afterprint', () => {
    document.body.classList.remove('print-individual');
  });

  document.getElementById('printGroupBtn').addEventListener('click', () => {
    if (subjects.length === 0) { toast('No hay sujetos para imprimir'); return; }
    window.print();
  });

  /* ---------- stats ---------- */

  const statsBody = document.getElementById('statsBody');
  const statsEmptyHint = document.getElementById('statsEmptyHint');
  const statsTable = document.getElementById('statsTable');

  function mean(a) { return a.reduce((x, y) => x + y, 0) / a.length; }
  function sampleSd(a) {
    if (a.length < 2) return 0;
    const m = mean(a);
    return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
  }
  function median(a) {
    const b = [...a].sort((x, y) => x - y);
    const mid = Math.floor(b.length / 2);
    return b.length % 2 ? b[mid] : (b[mid - 1] + b[mid]) / 2;
  }

  function renderStats() {
    const has = subjects.length > 0;
    statsTable.hidden = !has;
    statsEmptyHint.hidden = has;
    if (!has) { statsBody.innerHTML = ''; return; }

    const rows = subjects.map(computeAll);
    const cols = {
      'IMC': rows.map(r => r.imc),
      '% Grasa': rows.map(r => r.pctGrasa),
      'Endo': rows.map(r => r.endo),
      'Meso': rows.map(r => r.meso),
      'Ecto': rows.map(r => r.ecto),
    };
    const stats = [
      ['Promedio', v => mean(v)],
      ['Desv. estándar', v => sampleSd(v)],
      ['Mediana', v => median(v)],
      ['Máximo', v => Math.max(...v)],
      ['Mínimo', v => Math.min(...v)],
    ];
    statsBody.innerHTML = stats.map(([label, fn]) => {
      const cells = Object.values(cols).map(v => `<td>${fmt(fn(v), 2)}</td>`).join('');
      return `<tr><th>${label}</th>${cells}</tr>`;
    }).join('');
  }

  /* ---------- somatochart (Reuleaux triangle) ---------- */
  // Geometry follows the classic somatochart proportions (Siders & Rue, 1992,
  // "Reuleaux triangle somatocharts", Computers in Biology and Medicine 22(5)):
  // an equilateral reference triangle (Endo / Meso / Ecto vertices) whose
  // centroid sits at the origin — the point where the three components are
  // equal — with each side replaced by a circular arc centered on the
  // opposite vertex, bulging outward.

  const svg = document.getElementById('somatoChart');
  const chartTooltip = document.getElementById('chartTooltip');
  const chartEmptyHint = document.getElementById('chartEmptyHint');
  const chartLegend = document.getElementById('chartLegend');

  const SVG_NS = 'http://www.w3.org/2000/svg';
  // Margins sized so the plotted area is square (equal px-per-unit on both
  // axes) — required for the arcs below to render as true circles, not ellipses.
  const CHART = { w: 560, h: 552, m: { top: 24, right: 24, bottom: 46, left: 54 } };
  const DOMAIN = { xMin: -13, xMax: 13, yMin: -11, yMax: 15 };
  svg.setAttribute('viewBox', `0 0 ${CHART.w} ${CHART.h}`);

  const TRI_SIDE = 20;
  const TRI_R = TRI_SIDE / Math.sqrt(3);       // centroid → vertex
  const TRI_APOTHEM = TRI_SIDE / (2 * Math.sqrt(3)); // centroid → side
  const V_MESO = { x: 0, y: TRI_R };
  const V_ENDO = { x: -TRI_SIDE / 2, y: -TRI_APOTHEM };
  const V_ECTO = { x: TRI_SIDE / 2, y: -TRI_APOTHEM };

  function el(tag, attrs = {}) {
    const n = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    return n;
  }

  function sx(x) {
    const { left, right } = CHART.m;
    const w = CHART.w - left - right;
    return left + (x - DOMAIN.xMin) / (DOMAIN.xMax - DOMAIN.xMin) * w;
  }
  function sy(y) {
    const { top, bottom } = CHART.m;
    const h = CHART.h - top - bottom;
    return top + h - (y - DOMAIN.yMin) / (DOMAIN.yMax - DOMAIN.yMin) * h;
  }
  const proj = (v) => ({ x: sx(v.x), y: sy(v.y) });

  // Points (in pixel space) along the minor (60°) arc of the circle centered
  // at `center` from `from` to `to` — avoids SVG arc-flag sign ambiguity.
  function arcPoints(center, from, to, n = 28) {
    const radius = Math.hypot(from.x - center.x, from.y - center.y);
    const a0 = Math.atan2(from.y - center.y, from.x - center.x);
    let a1 = Math.atan2(to.y - center.y, to.x - center.x);
    let diff = a1 - a0;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + diff * (i / n);
      pts.push({ x: center.x + radius * Math.cos(a), y: center.y + radius * Math.sin(a) });
    }
    return pts;
  }

  function reuleauxPathD() {
    const meso = proj(V_MESO), endo = proj(V_ENDO), ecto = proj(V_ECTO);
    const pts = [
      ...arcPoints(meso, endo, ecto),
      ...arcPoints(endo, ecto, meso),
      ...arcPoints(ecto, meso, endo),
    ];
    return 'M ' + pts.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' L ') + ' Z';
  }

  function renderChart() {
    svg.innerHTML = '';
    const has = subjects.length > 0;
    chartEmptyHint.hidden = has;
    svg.style.display = has ? '' : 'none';
    chartLegend.style.display = has ? '' : 'none';
    if (!has) return;

    chartLegend.innerHTML = `
      <span class="legend__item"><span class="legend__swatch" style="background:var(--series-1)"></span>Femenino</span>
      <span class="legend__item"><span class="legend__swatch" style="background:var(--series-2)"></span>Masculino</span>
      <span class="legend__item">✕ Promedio</span>`;

    const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const mutedColor = cssVar('--text-muted');
    const surfaceColor = cssVar('--surface-card');
    const triColor = cssVar('--text-secondary');
    const sectorColor = cssVar('--border-strong');
    const gridColor = cssVar('--border');

    const centroidPx = proj({ x: 0, y: 0 });
    const mesoPx = proj(V_MESO), endoPx = proj(V_ENDO), ectoPx = proj(V_ECTO);

    // background grid + numeric ticks, every 5 units. The x=0/y=0 lines are
    // left to the dashed centroid→vertex sector lines drawn below, so they
    // aren't double-drawn as a solid+dashed line in the same place.
    const TICK = 5;
    for (let gx = Math.ceil(DOMAIN.xMin / TICK) * TICK; gx <= DOMAIN.xMax; gx += TICK) {
      if (gx !== 0) {
        svg.appendChild(el('line', {
          x1: sx(gx), x2: sx(gx), y1: sy(DOMAIN.yMin), y2: sy(DOMAIN.yMax),
          stroke: gridColor, 'stroke-width': 1,
        }));
      }
      const t = el('text', { x: sx(gx), y: sy(DOMAIN.yMin) + 16, 'text-anchor': 'middle', 'font-size': 10, fill: mutedColor });
      t.textContent = gx;
      svg.appendChild(t);
    }
    for (let gy = Math.ceil(DOMAIN.yMin / TICK) * TICK; gy <= DOMAIN.yMax; gy += TICK) {
      svg.appendChild(el('line', {
        x1: sx(DOMAIN.xMin), x2: sx(DOMAIN.xMax), y1: sy(gy), y2: sy(gy),
        stroke: gridColor, 'stroke-width': 1,
      }));
      const t = el('text', { x: sx(DOMAIN.xMin) - 8, y: sy(gy) + 3, 'text-anchor': 'end', 'font-size': 10, fill: mutedColor });
      t.textContent = gy;
      svg.appendChild(t);
    }

    // outer Reuleaux triangle boundary
    svg.appendChild(el('path', {
      d: reuleauxPathD(), fill: 'none', stroke: triColor, 'stroke-width': 1.5, 'stroke-linejoin': 'round',
    }));

    // X=0 reference line, full height (doubles as the centroid→Mesomorfia sector line)
    svg.appendChild(el('line', {
      x1: centroidPx.x, y1: sy(DOMAIN.yMin), x2: centroidPx.x, y2: sy(DOMAIN.yMax),
      stroke: sectorColor, 'stroke-width': 1, 'stroke-dasharray': '4 3',
    }));
    // diagonal sector lines: centroid → Endo / Ecto vertices
    for (const v of [endoPx, ectoPx]) {
      svg.appendChild(el('line', {
        x1: centroidPx.x, y1: centroidPx.y, x2: v.x, y2: v.y,
        stroke: sectorColor, 'stroke-width': 1, 'stroke-dasharray': '4 3',
      }));
    }

    // vertex labels — placed below the triangle's lowest point (the bottom
    // arc dips below the Endo/Ecto vertices themselves) so they never sit on the curve
    const bottomMostY = Math.max(...arcPoints(mesoPx, endoPx, ectoPx).map(p => p.y));
    const vLabel = (x, y, text, anchor) => {
      const t = el('text', { x, y, 'text-anchor': anchor, 'font-size': 12, 'font-weight': 600, fill: mutedColor });
      t.textContent = text;
      svg.appendChild(t);
    };
    vLabel(mesoPx.x, mesoPx.y - 10, 'Mesomorfia', 'middle');
    vLabel(endoPx.x, bottomMostY + 16, 'Endomorfia', 'middle');
    vLabel(ectoPx.x, bottomMostY + 16, 'Ectomorfia', 'middle');

    // axis labels
    const xLabel = el('text', { x: (sx(DOMAIN.xMin) + sx(DOMAIN.xMax)) / 2, y: CHART.h - 8, 'text-anchor': 'middle', 'font-size': 11, fill: mutedColor });
    xLabel.textContent = 'X — Ectomorfia − Endomorfia';
    svg.appendChild(xLabel);

    const yMid = (sy(DOMAIN.yMin) + sy(DOMAIN.yMax)) / 2;
    const yLabel = el('text', { x: 14, y: yMid, 'text-anchor': 'middle', 'font-size': 11, fill: mutedColor, transform: `rotate(-90 14 ${yMid})` });
    yLabel.textContent = 'Y — 2×Mesomorfia − (Endo+Ecto)';
    svg.appendChild(yLabel);

    const withResults = subjects.map(s => ({ s, r: computeAll(s) }));

    withResults.forEach(({ s, r }) => {
      const cx = sx(r.x), cy = sy(r.y);
      const color = s.sexo === 'F' ? 'var(--series-1)' : 'var(--series-2)';
      const dot = el('circle', {
        cx, cy, r: 6,
        fill: color,
        stroke: surfaceColor,
        'stroke-width': 2,
        tabindex: 0,
        role: 'img',
        'aria-label': `${s.nombre}: endomorfia ${fmt(r.endo, 2)}, mesomorfia ${fmt(r.meso, 2)}, ectomorfia ${fmt(r.ecto, 2)}`,
      });
      dot.style.cursor = 'pointer';
      const show = () => {
        chartTooltip.hidden = false;
        chartTooltip.style.left = cx / CHART.w * 100 + '%';
        chartTooltip.style.top = cy / CHART.h * 100 + '%';
        chartTooltip.innerHTML = `<strong>${escapeHtml(s.nombre)}</strong><br>Endo ${fmt(r.endo, 2)} · Meso ${fmt(r.meso, 2)} · Ecto ${fmt(r.ecto, 2)}`;
      };
      const hide = () => { chartTooltip.hidden = true; };
      dot.addEventListener('mouseenter', show);
      dot.addEventListener('mouseleave', hide);
      dot.addEventListener('focus', show);
      dot.addEventListener('blur', hide);
      svg.appendChild(dot);
    });

    // group-average markers (✕), one per sex present
    for (const sexo of ['F', 'M']) {
      const group = withResults.filter(w => w.s.sexo === sexo);
      if (group.length === 0) continue;
      const mx = mean(group.map(w => w.r.x));
      const my = mean(group.map(w => w.r.y));
      const cx = sx(mx), cy = sy(my);
      const color = sexo === 'F' ? 'var(--series-1)' : 'var(--series-2)';
      const arm = 7;
      const cross = el('path', {
        d: `M ${cx - arm},${cy - arm} L ${cx + arm},${cy + arm} M ${cx - arm},${cy + arm} L ${cx + arm},${cy - arm}`,
        stroke: color, 'stroke-width': 3, 'stroke-linecap': 'round',
        tabindex: 0, role: 'img',
        'aria-label': `Promedio ${sexo === 'F' ? 'femenino' : 'masculino'}: X ${fmt(mx, 2)}, Y ${fmt(my, 2)}`,
      });
      const show = () => {
        chartTooltip.hidden = false;
        chartTooltip.style.left = cx / CHART.w * 100 + '%';
        chartTooltip.style.top = cy / CHART.h * 100 + '%';
        chartTooltip.innerHTML = `<strong>Promedio ${sexo === 'F' ? 'femenino' : 'masculino'}</strong> (n=${group.length})<br>X ${fmt(mx, 2)} · Y ${fmt(my, 2)}`;
      };
      const hide = () => { chartTooltip.hidden = true; };
      cross.addEventListener('mouseenter', show);
      cross.addEventListener('mouseleave', hide);
      cross.addEventListener('focus', show);
      cross.addEventListener('blur', hide);
      svg.appendChild(cross);
    }
  }

  /* ---------- toast ---------- */

  let toastTimer = null;
  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
  }

  /* ---------- PWA install ---------- */

  let deferredPrompt = null;
  const installBtn = document.getElementById('installBtn');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.hidden = false;
  });
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBtn.hidden = true;
  });
  window.addEventListener('appinstalled', () => { installBtn.hidden = true; });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(err => console.error('SW error', err));
    });
  }

  /* ---------- init ---------- */

  resetForm();
  renderSubjects();
  renderStats();
  renderChart();
})();
