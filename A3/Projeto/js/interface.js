// PARTE VISUAL: desenho do tanque, Ladder ao vivo, painel, E/S, testes e eventos.
// Só lê e escreve as variáveis definidas em clp.js / planta.js / testes.js.

const $ = id => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs, parent){ const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
const fmtT = ms => { const s = Math.floor(ms/1000); return String(Math.floor(s/60)).padStart(2,'0') + ':' + String(s%60).padStart(2,'0'); };
const sec = ms => (ms/1000).toFixed(1).replace('.', ',') + ' s';
const tog = (e, c, b) => e.classList.toggle(c, !!b);
$('hRungs').textContent = RUNGS.length;
const FORCED = { S_H:'Hoff', S_HH:'HHon', S_L:'Lon', S_LL:'LLoff' };
const isForced = k => FORCED[k] && SIM.fault[FORCED[k]];

// sensores
const tankY = lv => 380 - lv * 3.2;
const senEls = {};
for (const [k, lv] of Object.entries(LEVELS)) {
  const y = tankY(lv); const g = el('g', {class:'sen'}, $('sensors'));
  el('line', {x1:300, y1:y, x2:322, y2:y, stroke:'#3a444d', 'stroke-width':2}, g);
  el('circle', {cx:328, cy:y, r:6.5}, g);
  const t = el('text', {x:340, y:y+4}, g); senEls[k] = {g, t};
}

// E/S
const ioEls = {};
function ioList(id, keys){ $(id).innerHTML = keys.map(k => `<li id="io_${k}"><span class="dot${/VERMELHA|SIRENE/.test(k)?' alarm':''}"></span><span class="a">${ADDR[k]}</span><span class="t">${k}</span><span class="d">${DESC[k]}</span></li>`).join(''); keys.forEach(k => ioEls[k] = $('io_'+k)); }
ioList('ioIn', Object.keys(V).filter(k => /^I/.test(ADDR[k])));
ioList('ioOut', Object.keys(V).filter(k => /^Q/.test(ADDR[k])));

// Ladder
const CW = 104, RH = 58, Y0 = 30, OUTW = 150;
function size(n){
  if (n.k === 'NO' || n.k === 'NC') return {w:CW, h:RH};
  let w = 0, h = 0;
  for (const c of n.c) { const s = size(c); if (n.k === 'S') { w += s.w; h = Math.max(h, s.h); } else { w = Math.max(w, s.w); h += s.h; } }
  return {w, h};
}
const ups = [];
function draw(n, x, y, g){
  if (n.k === 'NO' || n.k === 'NC') {
    const wl = el('line', {x1:x, y1:y+Y0, x2:x+42, y2:y+Y0, class:'w'}, g);
    const wr = el('line', {x1:x+62, y1:y+Y0, x2:x+CW, y2:y+Y0, class:'w'}, g);
    const ct = el('g', {class:'ct'}, g);
    el('rect', {x:x+42, y:y+Y0-13, width:20, height:26}, ct);
    el('line', {x1:x+43, y1:y+Y0-13, x2:x+43, y2:y+Y0+13}, ct);
    el('line', {x1:x+61, y1:y+Y0-13, x2:x+61, y2:y+Y0+13}, ct);
    if (n.k === 'NC') el('line', {x1:x+38, y1:y+Y0+13, x2:x+66, y2:y+Y0-13}, ct);
    el('text', {x:x+52, y:y+11, 'text-anchor':'middle'}, g).textContent = n.v;
    const base = n.v.replace('.Q','');
    el('text', {x:x+52, y:y+Y0+26, 'text-anchor':'middle', class:'ad'}, g).textContent = (ADDR[base] || (T[base] ? 'TON' : C[base] ? 'CTU' : '')) + (n.k === 'NC' ? ' · NF' : ' · NA');
    ups.push(() => { tog(wl,'p',n._in); tog(wr,'p',n._out); tog(ct,'cl',n._c); });
    return;
  }
  const s = size(n);
  if (n.k === 'S') { let cx = x; for (const c of n.c) { draw(c, cx, y, g); cx += size(c).w; } return; }
  let cy = y, lastY = y;
  for (const c of n.c) {
    const cs = size(c); draw(c, x, cy, g);
    if (cs.w < s.w) { const pad = el('line', {x1:x+cs.w, y1:cy+Y0, x2:x+s.w, y2:cy+Y0, class:'w'}, g); ups.push(() => tog(pad,'p',c._out)); }
    lastY = cy; cy += cs.h;
  }
  const vl = el('line', {x1:x, y1:y+Y0, x2:x, y2:lastY+Y0, class:'w'}, g);
  const vr = el('line', {x1:x+s.w, y1:y+Y0, x2:x+s.w, y2:lastY+Y0, class:'w'}, g);
  ups.push(() => { tog(vl,'p',n._in); tog(vr,'p',n._out); });
}
const W = 20 + Math.max(...RUNGS.map(r => size(r.l).w)) + 30 + OUTW + 14;
let lastG = '';
RUNGS.forEach((r, i) => {
  if (r.g !== lastG) { const h = document.createElement('div'); h.className = 'grp'; h.textContent = r.g; $('ladder').appendChild(h); lastG = r.g; }
  const div = document.createElement('div'); div.className = 'rung';
  div.innerHTML = `<div class="rhead"><b>${String(i+1).padStart(3,'0')}</b><span>${r.t}</span></div><div class="rscroll"></div>`;
  $('ladder').appendChild(div);
  const sz = size(r.l), isBlk = r.o.k === 'ton' || r.o.k === 'ctu';
  const H = Math.max(sz.h, isBlk ? 90 : RH) + 4;
  const svg = el('svg', {class:'lad', width:W, height:H, viewBox:`0 0 ${W} ${H}`}, div.querySelector('.rscroll'));
  el('line', {x1:8, y1:0, x2:8, y2:H, class:'rail'}, svg);
  el('line', {x1:8, y1:Y0, x2:20, y2:Y0, class:'w p'}, svg);
  draw(r.l, 20, 0, svg);
  const ox = W - 14 - OUTW;
  const wc = el('line', {x1:20+sz.w, y1:Y0, x2:ox + (isBlk ? 12 : 50), y2:Y0, class:'w'}, svg);
  ups.push(() => { tog(wc,'p',r.pw); tog(div,'pw',r.pw); });
  if (!isBlk) {
    el('line', {x1:W-14, y1:0, x2:W-14, y2:H, class:'rail'}, svg);
    const cg = el('g', {class:'coil'}, svg); const cx = ox + 75;
    el('circle', {cx, cy:Y0, r:15}, cg);
    el('path', {d:`M${cx-8} ${Y0-15} Q${cx-20} ${Y0} ${cx-8} ${Y0+15}`}, cg);
    el('path', {d:`M${cx+8} ${Y0-15} Q${cx+20} ${Y0} ${cx+8} ${Y0+15}`}, cg);
    if (r.o.k === 'res') el('text', {x:cx, y:Y0+4, 'text-anchor':'middle', class:'r'}, cg).textContent = 'R';
    const w1 = el('line', {x1:ox+50, y1:Y0, x2:cx-25, y2:Y0, class:'w'}, svg);
    const w2 = el('line', {x1:cx+25, y1:Y0, x2:W-14, y2:Y0, class:'w'}, svg);
    el('text', {x:cx, y:11, 'text-anchor':'middle'}, svg).textContent = r.o.v;
    el('text', {x:cx, y:Y0+28, 'text-anchor':'middle', class:'ad'}, svg).textContent = r.o.k === 'res' ? 'Reset do contador' : (ADDR[r.o.v] || '');
    ups.push(() => { tog(cg,'on',r.pw); tog(w1,'p',r.pw); tog(w2,'p',r.pw); });
  } else {
    const isT = r.o.k === 'ton', obj = isT ? T[r.o.v] : C[r.o.v];
    const bx = ox + 12, bw = OUTW - 12;
    const bg = el('g', {class:'blk'}, svg);
    el('rect', {x:bx, y:16, width:bw, height:70, rx:3, class:'box'}, bg);
    el('text', {x:bx+bw/2, y:11, 'text-anchor':'middle', class:'h'}, bg).textContent = r.o.v;
    el('text', {x:bx+bw/2, y:30, 'text-anchor':'middle', class:'h'}, bg).textContent = isT ? 'TON' : 'CTU';
    el('text', {x:bx+5, y:Y0+4}, bg).textContent = isT ? 'IN' : 'CU';
    el('text', {x:bx+bw-6, y:Y0+4, 'text-anchor':'end', class:'q'}, bg).textContent = 'Q';
    const l1 = el('text', {x:bx+6, y:56}, bg);
    const l2 = el('text', {x:bx+6, y:70, class:'ad'}, bg);
    el('rect', {x:bx+6, y:76, width:bw-12, height:5, fill:'#e1e5e8'}, bg);
    const bar = el('rect', {x:bx+6, y:76, width:0, height:5, class:'bar'}, bg);
    l2.textContent = isT ? 'PT ' + sec(obj.pt) : 'PV ' + obj.pv;
    ups.push(() => {
      tog(bg,'on',r.pw); tog(bg,'q',obj.q);
      if (isT) { l1.textContent = 'ET ' + sec(obj.et); bar.setAttribute('width', (bw-12) * obj.et / obj.pt); }
      else { l1.textContent = `CV ${obj.cv}`; bar.setAttribute('width', (bw-12) * Math.min(1, obj.cv / obj.pv)); }
    });
  }
});

// tabelas
const memKeys = Object.keys(V).filter(k => /^M/.test(ADDR[k]));
$('tMem').innerHTML = '<tr><th>Endereço</th><th>Tag</th><th>Descrição</th><th>Estado</th></tr>' +
  memKeys.map(k => `<tr><td class="m">${ADDR[k]}</td><td class="m">${k}</td><td>${DESC[k]}</td><td><span class="dot${/^F_|M_FALHA/.test(k)?' alarm':''}" id="d_${k}"></span></td></tr>`).join('');
$('tTon').innerHTML = '<tr><th>Tag</th><th>Função</th><th>PT</th><th>ET</th><th></th><th>Q</th></tr>' +
  Object.entries(T).map(([k,t]) => `<tr><td class="m">${k}</td><td>${t.d}</td><td class="m">${sec(t.pt)}</td><td class="m" id="et_${k}"></td><td><div class="tbar" id="tb_${k}"><span></span></div></td><td><span class="dot" id="tq_${k}"></span></td></tr>`).join('');
$('tCtu').innerHTML = '<tr><th>Tag</th><th>Função</th><th>PV</th><th>CV</th><th>Zerado por</th><th>Q</th></tr>' +
  Object.entries(C).map(([k,c]) => `<tr><td class="m">${k}</td><td>${c.d}</td><td class="m">${c.pv}</td><td class="m" id="cv_${k}"></td><td class="m">T_RST_LONGO.Q</td><td><span class="dot" id="cq_${k}"></span></td></tr>`).join('');

// falhas ao vivo
$('faultList').innerHTML = Object.entries(FAULTS).map(([k,f]) => `<label><input type="checkbox" data-f="${k}"><span>${f.n}<small>${f.d}</small></span></label>`).join('');
$('faultList').querySelectorAll('input').forEach(i => i.onchange = () => { SIM.fault[i.dataset.f] = i.checked; addLog((i.checked ? 'Falha injetada: ' : 'Falha removida: ') + FAULTS[i.dataset.f].n, i.checked ? 'a' : ''); });
const syncFaultBoxes = () => $('faultList').querySelectorAll('input').forEach(i => i.checked = !!SIM.fault[i.dataset.f]);

// comandos
const held = {};
function momentary(btn, name){
  const on = e => { e.preventDefault(); if (btn.disabled) return; V[name] = true; held[name] = performance.now(); btn.classList.add('down'); try { btn.setPointerCapture(e.pointerId); } catch(_){} };
  const off = () => { if (!btn.classList.contains('down')) return; btn.classList.remove('down');
    const rest = 150 - (performance.now() - held[name]); if (rest > 0) setTimeout(() => V[name] = false, rest); else V[name] = false; };
  btn.addEventListener('pointerdown', on); btn.addEventListener('pointerup', off); btn.addEventListener('pointercancel', off);
  btn.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) on(e); });
  btn.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') off(); });
}
momentary($('bStart'), 'BT_PARTIDA'); momentary($('bStop'), 'BT_PARADA'); momentary($('bReset'), 'BT_RESET'); momentary($('bMan'), 'BT_BOMBA_MAN');
$('bEmerg').onclick = () => { V.BT_EMERG = !V.BT_EMERG; };
const setMode = man => { V.CH_MANUAL = man; $('mMan').classList.toggle('active', man); $('mAuto').classList.toggle('active', !man); $('bMan').disabled = !man; };
$('mAuto').onclick = () => setMode(false); $('mMan').onclick = () => setMode(true);
const setCons = c => { SIM.cons = c; $('cons').value = c; $('consO').textContent = c.toFixed(1).replace('.', ',') + ' %/s'; };
$('cons').oninput = e => setCons(+e.target.value);
let speed = 1;
const setSpeed = s => { speed = s; $('speed').querySelectorAll('button').forEach(x => x.classList.toggle('active', +x.dataset.s === s)); };
$('speed').querySelectorAll('button').forEach(b => b.onclick = () => setSpeed(+b.dataset.s));
$('lvLow').onclick = () => SIM.level = 20;
$('lvHigh').onclick = () => SIM.level = 75;
function restart(level = 50){ resetPLC(); clearFaults(); syncFaultBoxes(); SIM.level = level; SIM.t = 0; setMode(false); $('log').innerHTML = ''; prevEv = {}; }
$('restart').onclick = () => { restart(); setCons(1.5); addLog('Simulação reiniciada', ''); };
function showTab(id){ document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('active', x.dataset.v === id)); document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === id)); }
document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => showTab(b.dataset.v));

// testes automáticos (rodam num CLP isolado: salva e restaura o estado ao vivo)
function snapshot(){ return JSON.stringify({V, T, C, SIM}); }
function restore(s){ const o = JSON.parse(s); Object.assign(V, o.V); for (const k in T) Object.assign(T[k], o.T[k]); for (const k in C) Object.assign(C[k], o.C[k]); Object.assign(SIM, o.SIM); }
$('tests').innerHTML = TESTS.map(t => `<div class="tcard" id="tc_${t.id}"><div class="thead"><h4>${t.n}</h4><span class="badge">não executado</span>
  <button class="small-btn" data-run="${t.id}">Executar</button><button class="small-btn" data-live="${t.id}">Ver ao vivo</button></div><p>${t.d}</p><ul class="tres"></ul></div>`).join('');
function execTest(t){
  const snap = snapshot(); let r; try { r = runTest(t); } finally { restore(snap); }
  const card = $('tc_'+t.id); card.className = 'tcard ' + (r.ok ? 'pass' : 'fail');
  card.querySelector('.badge').textContent = r.ok ? 'PASSOU' : 'FALHOU';
  card.querySelector('.tres').innerHTML = r.res.map(x => `<li><span class="${x.ok?'ok':'no'}">${x.ok?'✓':'✗'}</span><span>${x.what}</span><span class="obs">${x.obs}</span></li>`).join('');
  return r.ok;
}
document.querySelectorAll('[data-run]').forEach(b => b.onclick = () => execTest(TESTS.find(t => t.id === b.dataset.run)));
document.querySelectorAll('[data-live]').forEach(b => b.onclick = () => {
  const t = TESTS.find(x => x.id === b.dataset.live);
  restart(t.lv); for (const f of t.f) SIM.fault[f] = true; syncFaultBoxes(); setCons(t.cons); setSpeed(5);
  addLog('Cenário ao vivo: ' + t.n + ' — pressione PARTIDA', 'a'); showTab('vLad'); window.scrollTo({top:0, behavior:'smooth'});
});
$('runAll').onclick = () => { let ok = 0; for (const t of TESTS) if (execTest(t)) ok++;
  const s = $('tSum'); s.textContent = `${ok} de ${TESTS.length} testes passaram`; s.className = 'tsum ' + (ok === TESTS.length ? 'ok' : 'bad'); };

// eventos
const EVS = [
  ['M_SIST','Sistema LIGADO','Sistema DESLIGADO','g',''], ['BOMBA','Comando: bomba LIGA','Comando: bomba desliga','g',''],
  ['VALV_DRENO','Válvula de dreno ABRIU','Válvula de dreno fechou','a',''],
  ['F_TRANSB','FALHA: transbordo (HH)','Falha de transbordo reconhecida','a',''], ['F_BOMBA','FALHA: bomba sem vazão (40 s)','Falha de bomba reconhecida','a',''],
  ['F_SENSOR','FALHA: sensores inconsistentes','Falha de sensor reconhecida','a',''], ['F_CONTATOR','FALHA: contator não obedece ao comando','Falha de contator reconhecida','a',''],
  ['C_TRANSB.Q','BLOQUEIO: 3 transbordos — segure RESET 5 s','Bloqueio liberado (contador zerado)','a','g'],
  ['C_PARTIDAS.Q','AVISO: manutenção da bomba (5 partidas)','Contador de partidas zerado','a','g'],
  ['BT_EMERG','EMERGÊNCIA acionada','Emergência destravada','a',''], ['CH_MANUAL','Modo MANUAL','Modo AUTOMÁTICO','','']
];
let prevEv = {};
function addLog(msg, cls){ const li = document.createElement('li'); li.className = cls; li.innerHTML = `<time>${fmtT(SIM.t)}</time><span>${msg}</span>`; $('log').prepend(li); }
function checkEvents(){ for (const [k, on, off, c1, c2] of EVS) { const v = get(k); if (prevEv[k] !== undefined && prevEv[k] !== v) addLog(v ? on : off, v ? c1 : c2); prevEv[k] = v; } }

function render(){
  const lv = SIM.level, y = tankY(lv);
  $('water').setAttribute('y', y); $('water').setAttribute('height', 380 - y); $('waterTop').setAttribute('y', y);
  $('lvlTxt').setAttribute('y', Math.max(80, Math.min(370, y - 8)));
  $('lvlTxt').textContent = lv.toFixed(0) + '%  ·  ' + Math.round(lv * 50).toLocaleString('pt-BR') + ' L';
  for (const k in senEls) { const f = isForced(k); tog(senEls[k].g,'on',V[k]); tog(senEls[k].g,'forced',f); senEls[k].t.textContent = k.replace('S_','') + ' ' + ADDR[k] + (f ? ' ⚠ travado' : ''); }
  tog($('tank'), 'spin', SIM.running); tog($('tank'), 'pumpwarn', V.BOMBA !== V.FB_BOMBA);
  $('pCmd').textContent = 'cmd Q0.0: ' + (V.BOMBA ? 1 : 0); $('pFb').textContent = 'ret I1.2: ' + (V.FB_BOMBA ? 1 : 0);
  $('pFb').setAttribute('fill', V.BOMBA !== V.FB_BOMBA ? '#cf3328' : '#1c2329'); $('pCmd').setAttribute('fill', V.BOMBA !== V.FB_BOMBA ? '#cf3328' : '#1c2329');
  tog($('fIn'), 'on', SIM.running && !SIM.fault.noflow);
  tog($('fDr'), 'on', V.VALV_DRENO); tog($('vDr'), 'on', V.VALV_DRENO);
  tog($('fOut'), 'on', SIM.cons > 0 && lv > 0); tog($('vOut'), 'on', SIM.cons > 0);
  tog($('lG'),'on',V.LUZ_VERDE); tog($('lY'),'on',V.LUZ_AMARELA); tog($('lR'),'on',V.LUZ_VERMELHA); tog($('lS'),'on',V.SIRENE); tog($('lLS'),'on',V.LED_SISTEMA); tog($('lLB'),'on',V.LED_BOMBA);
  tog($('bEmerg'), 'active', V.BT_EMERG);
  $('rProg').style.width = (100 * T.T_RST_LONGO.et / T.T_RST_LONGO.pt) + '%';
  $('hTime').textContent = fmtT(SIM.t);
  $('hMode').textContent = !V.M_SIST ? 'OFF' : V.CH_MANUAL ? 'MANUAL' : 'AUTO';
  const st = $('status'); let txt, cls;
  if (V.BT_EMERG) { txt = 'EMERGÊNCIA ACIONADA — destrave e dê partida'; cls = 'alarm'; }
  else if (C.C_TRANSB.q) { txt = 'BLOQUEADO — 3 transbordos. Segure RESET por 5 s'; cls = 'alarm'; }
  else if (V.M_FALHA) { const f = []; if (V.F_TRANSB) f.push('transbordo'); if (V.F_BOMBA) f.push('bomba sem vazão'); if (V.F_SENSOR) f.push('sensor'); if (V.F_CONTATOR) f.push('contator'); txt = 'FALHA: ' + f.join(', ') + ' — corrija e pressione RESET'; cls = 'alarm'; }
  else if (!V.M_SIST) { txt = 'Sistema desligado — pressione PARTIDA'; cls = ''; }
  else if (C.C_PARTIDAS.q) { txt = (V.BOMBA ? 'Enchendo' : 'Em espera') + ' · manutenção da bomba pendente'; cls = 'warn'; }
  else if (!V.S_LL) { txt = 'Nível crítico (abaixo de LL)' + (V.BOMBA ? ' — enchendo' : ''); cls = 'warn'; }
  else if (V.CH_MANUAL) { txt = 'Modo manual' + (V.BOMBA ? ' — bomba ligada' : ''); cls = 'warn'; }
  else if (V.BOMBA) { txt = 'Automático — enchendo até H'; cls = 'ok'; }
  else if (T.T_BAIXO.in) { txt = 'Automático — nível abaixo de L, confirmando…'; cls = 'ok'; }
  else { txt = 'Automático — aguardando (nível entre L e H)'; cls = 'ok'; }
  st.textContent = txt; st.className = 'status ' + cls;
  for (const u of ups) u();
  for (const k in ioEls) { tog(ioEls[k], 'on', V[k]); tog(ioEls[k].firstChild, 'on', V[k]); tog(ioEls[k], 'forced', isForced(k) || (k === 'FB_BOMBA' && (SIM.fault.weld || SIM.fault.noclose))); }
  for (const k of memKeys) tog($('d_'+k), 'on', V[k]);
  for (const k in T) { $('et_'+k).textContent = sec(T[k].et); const b = $('tb_'+k); b.firstChild.style.width = (100*T[k].et/T[k].pt)+'%'; tog(b,'q',T[k].q); tog($('tq_'+k),'on',T[k].q); }
  for (const k in C) { $('cv_'+k).textContent = C[k].cv; tog($('cq_'+k),'on',C[k].q); }
}
step(50);
setInterval(() => { for (let i = 0; i < speed; i++) { step(50); checkEvents(); } render(); }, 50);
addLog('Simulador pronto — pressione PARTIDA', '');
