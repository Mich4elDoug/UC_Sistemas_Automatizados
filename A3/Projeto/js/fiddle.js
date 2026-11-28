// PARTE VISUAL: desenha os 28 rungs de clp.js no visual do PLC Fiddle e executa a varredura.
// Não contém lógica de controle: tudo vem de RUNGS / V / T / C (clp.js).

const $ = id => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, a, p) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
const tog = (e, c, b) => e.classList.toggle(c, !!b);
const sec = ms => (ms / 1000).toFixed(1).replace('.', ',');
const ups = [];

// ---------- painel de variáveis ----------
const groups = [
  ['Entradas', Object.keys(V).filter(k => /^I/.test(ADDR[k])), 'in'],
  ['Saídas', Object.keys(V).filter(k => /^Q/.test(ADDR[k])), ''],
  ['Memórias', Object.keys(V).filter(k => /^M/.test(ADDR[k])), ''],
];
const vl = $('varList');
for (const [g, keys, cls] of groups) {
  vl.insertAdjacentHTML('beforeend', `<div class="vgrp">${g} · Boolean</div>`);
  for (const k of keys) {
    const d = document.createElement('div'); d.className = 'var ' + cls; d.title = `${ADDR[k]} — ${DESC[k]}`;
    d.innerHTML = `<span class="x">X</span><span class="nm">${k}</span><span class="st">OFF</span>`;
    if (cls === 'in') d.querySelector('.st').onclick = () => { if (!(tankMode() && /^S_|FB_/.test(k)) && !(k === 'FB_BOMBA' && $('optFb').checked)) V[k] = !V[k]; };
    vl.appendChild(d);
    const st = d.querySelector('.st');
    ups.push(() => { tog(d, 'on', V[k]); st.textContent = V[k] ? 'ON' : 'OFF'; });
  }
}
vl.insertAdjacentHTML('beforeend', '<div class="vgrp">Timers</div>');
for (const k in T) {
  const d = document.createElement('div'); d.className = 'var'; d.title = T[k].d;
  d.innerHTML = `<span class="x">X</span><span class="nm">${k}</span><span class="tv"></span>`; vl.appendChild(d);
  const tv = d.querySelector('.tv');
  ups.push(() => { tog(d, 'q', T[k].q); tv.textContent = `${sec(T[k].et)} / ${sec(T[k].pt)} s`; });
}
vl.insertAdjacentHTML('beforeend', '<div class="vgrp">Counters</div>');
for (const k in C) {
  const d = document.createElement('div'); d.className = 'var'; d.title = C[k].d;
  d.innerHTML = `<span class="x">X</span><span class="nm">${k}</span><span class="tv"></span>`; vl.appendChild(d);
  const tv = d.querySelector('.tv');
  ups.push(() => { tog(d, 'q', C[k].q); tv.textContent = `${C[k].cv} / ${C[k].pv}`; });
}

// ---------- paleta de instruções (onde achar cada peça) ----------
const sym = {
  NA: '<svg width="80" height="16"><line x1="0" y1="8" x2="34" y2="8" class="w"/><line x1="46" y1="8" x2="80" y2="8" class="w"/><g class="ct"><line x1="35" y1="1" x2="35" y2="15"/><line x1="45" y1="1" x2="45" y2="15"/></g></svg>',
  NF: '<svg width="80" height="16"><line x1="0" y1="8" x2="34" y2="8" class="w"/><line x1="46" y1="8" x2="80" y2="8" class="w"/><g class="ct"><line x1="35" y1="1" x2="35" y2="15"/><line x1="45" y1="1" x2="45" y2="15"/><line x1="32" y1="15" x2="48" y2="1"/></g></svg>',
  COIL: '<svg width="80" height="18"><line x1="0" y1="9" x2="32" y2="9" class="w"/><line x1="48" y1="9" x2="80" y2="9" class="w"/><g class="coil"><circle cx="40" cy="9" r="7"/></g></svg>',
  BOX: t => `<svg width="104" height="36"><g class="blk"><rect x="2" y="2" width="100" height="32" rx="4"/></g><text x="52" y="22" text-anchor="middle" class="bt">${t}</text></svg>`
};
const PAL = {
  'Contacts': [[sym.NA, 'Contato NA — conduz com a variável ON (ex.: S_H)'], [sym.NF, 'Contato NF — conduz com a variável OFF (ex.: /S_L)']],
  'Coils': [[sym.COIL, 'Bobina — saídas e memórias (ex.: BOMBA, M_SIST)']],
  'Math': [['', 'Não usado neste projeto']],
  'Compare': [['', 'Não usado neste projeto']],
  'Time/Count': [[sym.BOX('On Delay Timer'), 'TON — 8 timers (preset na variável)'], [sym.BOX('Count Up'), 'CTU — C_TRANSB e C_PARTIDAS'], [sym.BOX('Reset'), 'Reset do contador — rungs 17 e 18 (se não estiver aqui, procure em Other/Coils)']],
  'Other': [['', 'Ramos em paralelo: crie a partir do contato, puxando um branch para baixo']]
};
const pt = $('ptabs'), pb = $('pbody');
function showPal(name){
  pt.querySelectorAll('span').forEach(s => tog(s, 'act', s.textContent === name));
  pb.innerHTML = PAL[name].map(([s, t]) => `<div class="pitem">${s ? '<div class="sel" style="width:84px">Variable</div>' : ''}${s}<span>${t}</span></div>`).join('');
}
Object.keys(PAL).forEach(n => { const s = document.createElement('span'); s.textContent = n; s.onclick = () => showPal(n); pt.appendChild(s); });
showPal('Contacts');

// ---------- ladder ----------
const CW = 152, RH = 58, LINE = 40, TOP = 18, X0 = 22, OW = 176, RAIL_L = 10;
function size(n){
  if (n.k === 'NO' || n.k === 'NC') return {w:CW, h:RH};
  let w = 0, h = 0;
  for (const c of n.c) { const s = size(c); if (n.k === 'S') { w += s.w; h = Math.max(h, s.h); } else { w = Math.max(w, s.w); h += s.h; } }
  return {w, h};
}
function selBox(parent, x, y, w, text){ const d = document.createElement('div'); d.className = 'sel'; d.style.left = x + 'px'; d.style.top = y + 'px'; d.style.width = w + 'px'; d.textContent = text; parent.appendChild(d); return d; }
function draw(n, x, y, svg, box){
  if (n.k === 'NO' || n.k === 'NC') {
    const cy = y + LINE, mx = x + CW / 2;
    selBox(box, x + 12, y + 6, CW - 24, n.v);
    svgEl('line', {x1:x, y1:cy, x2:mx - 5, y2:cy, class:'w'}, svg);
    svgEl('line', {x1:mx + 5, y1:cy, x2:x + CW, y2:cy, class:'w'}, svg);
    const g = svgEl('g', {class:'ct'}, svg);
    svgEl('line', {x1:mx - 4, y1:cy - 7, x2:mx - 4, y2:cy + 7}, g);
    svgEl('line', {x1:mx + 4, y1:cy - 7, x2:mx + 4, y2:cy + 7}, g);
    if (n.k === 'NC') svgEl('line', {x1:mx - 8, y1:cy + 7, x2:mx + 8, y2:cy - 7}, g);
    ups.push(() => tog(g, 'cl', n._c));
    return;
  }
  const s = size(n);
  if (n.k === 'S') { let cx = x; for (const c of n.c) { draw(c, cx, y, svg, box); cx += size(c).w; } return; }
  let cy = y, lastY = y;
  for (const c of n.c) {
    const cs = size(c); draw(c, x, cy, svg, box);
    if (cs.w < s.w) svgEl('line', {x1:x + cs.w, y1:cy + LINE, x2:x + s.w, y2:cy + LINE, class:'w'}, svg);
    lastY = cy; cy += cs.h;
  }
  if (lastY > y) {
    svgEl('line', {x1:x + 1, y1:y + LINE, x2:x + 1, y2:lastY + LINE, class:'w'}, svg);
    svgEl('line', {x1:x + s.w - 1, y1:y + LINE, x2:x + s.w - 1, y2:lastY + LINE, class:'w'}, svg);
  }
}
const W = X0 + Math.max(...RUNGS.map(r => size(r.l).w)) + 40 + OW + 14;
const RAIL_R = W - 10;
const lad = $('ladder');
let lastG = '';
RUNGS.forEach((r, i) => {
  if (r.g !== lastG) {
    const h = document.createElement('div'); h.className = 'rgrp'; h.textContent = r.g;
    h.style.width = (RAIL_R - 5.5) + 'px'; h.style.borderRight = '5px solid #555';
    lad.appendChild(h); lastG = r.g;
  }
  const sz = size(r.l), isBlk = r.o.k !== 'coil';
  const H = TOP + Math.max(sz.h, isBlk ? 62 : RH) + 10;
  const div = document.createElement('div'); div.className = 'rung'; div.style.width = W + 'px'; div.style.height = H + 'px';
  div.innerHTML = `<span class="rcmt"><b>Rung ${i + 1}</b> — ${r.t}</span>`;
  lad.appendChild(div);
  const svg = svgEl('svg', {width:W, height:H}, div);
  svgEl('line', {x1:RAIL_L, y1:0, x2:RAIL_L, y2:H, class:'rail'}, svg);
  svgEl('line', {x1:RAIL_R, y1:0, x2:RAIL_R, y2:H, class:'rail'}, svg);
  const yL = TOP + LINE;
  svgEl('line', {x1:RAIL_L, y1:yL, x2:X0, y2:yL, class:'w'}, svg);
  draw(r.l, X0, TOP, svg, div);
  const ox = RAIL_R - OW;
  if (!isBlk) {
    const cx = RAIL_R - 52;
    svgEl('line', {x1:X0 + sz.w, y1:yL, x2:cx - 8, y2:yL, class:'w'}, svg);
    svgEl('line', {x1:cx + 8, y1:yL, x2:RAIL_R, y2:yL, class:'w'}, svg);
    const g = svgEl('g', {class:'coil'}, svg); svgEl('circle', {cx, cy:yL, r:7.5}, g);
    selBox(div, RAIL_R - 140, TOP + 6, 132, r.o.v);
    ups.push(() => tog(g, 'on', r.pw));
  } else {
    const title = r.o.k === 'ton' ? 'On Delay Timer' : r.o.k === 'ctu' ? 'Count Up' : 'Reset';
    const bx = ox + 26, bw = RAIL_R - 8 - bx, by = TOP + 2, bh = 58;
    svgEl('line', {x1:X0 + sz.w, y1:yL, x2:bx, y2:yL, class:'w'}, svg);
    const g = svgEl('g', {class:'blk'}, svg);
    svgEl('rect', {x:bx, y:by, width:bw, height:bh, rx:5}, g);
    const t = svgEl('text', {x:bx + bw / 2, y:by + 12, 'text-anchor':'middle', class:'bt'}, g); t.textContent = title;
    const v = svgEl('text', {x:bx + bw / 2, y:by + bh - 4, 'text-anchor':'middle', class:'bv'}, g);
    selBox(div, bx + 6, by + 15, bw - 12, r.o.v);
    if (r.o.k === 'ton') { const o = T[r.o.v]; ups.push(() => { tog(g,'on',r.pw); tog(g,'q',o.q); v.textContent = `PT ${sec(o.pt)} s · ET ${sec(o.et)} s`; }); }
    else if (r.o.k === 'ctu') { const o = C[r.o.v]; ups.push(() => { tog(g,'on',r.pw); tog(g,'q',o.q); v.textContent = `PV ${o.pv} · CV ${o.cv}`; }); }
    else { v.textContent = 'zera ' + r.o.v; ups.push(() => tog(g,'on',r.pw)); }
  }
});

// ---------- execução ----------
const tankMode = () => $('optTank').checked;
$('optTank').onchange = () => { if (tankMode()) { SIM.level = 50; clearFaults(); } };
function render(){ for (const u of ups) u(); }
setInterval(() => {
  if (tankMode()) step(50);
  else { if ($('optFb').checked) V.FB_BOMBA = V.BOMBA; scan(50); }
  render();
}, 50);
render();
