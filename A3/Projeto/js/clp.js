// LÓGICA DO CLP: variáveis, mapa de E/S, 28 rungs Ladder e ciclo de varredura. Não depende da interface.
// Projeto A3 — Sistemas Automatizados — Controle de Tanque de Água

// ===== LÓGICA DO CLP (idêntica ao Ladder do guia do PLC Fiddle) =====
const LEVELS = { S_LL: 10, S_L: 30, S_H: 80, S_HH: 92 };
const PHYS = { bomba: 5, dreno: 8 }; // %/s
const V = {
  S_LL:false, S_L:false, S_H:false, S_HH:false,
  BT_PARTIDA:false, BT_PARADA:false, BT_EMERG:false, BT_RESET:false, CH_MANUAL:false, BT_BOMBA_MAN:false, FB_BOMBA:false,
  M_SIST:false, M_AUTO:false, M_DEMANDA:false, F_SENSOR:false, F_TRANSB:false, F_BOMBA:false, F_CONTATOR:false, M_FALHA:false,
  BOMBA:false, VALV_DRENO:false, LUZ_VERDE:false, LUZ_AMARELA:false, LUZ_VERMELHA:false, SIRENE:false, LED_SISTEMA:false, LED_BOMBA:false
};
const ADDR = {
  S_LL:'I0.0', S_L:'I0.1', S_H:'I0.2', S_HH:'I0.3', BT_PARTIDA:'I0.4', BT_PARADA:'I0.5', BT_EMERG:'I0.6',
  BT_RESET:'I0.7', CH_MANUAL:'I1.0', BT_BOMBA_MAN:'I1.1', FB_BOMBA:'I1.2',
  BOMBA:'Q0.0', VALV_DRENO:'Q0.1', LUZ_VERDE:'Q0.2', LUZ_AMARELA:'Q0.3', LUZ_VERMELHA:'Q0.4', SIRENE:'Q0.5', LED_SISTEMA:'Q0.6', LED_BOMBA:'Q0.7',
  M_SIST:'M0.0', M_AUTO:'M0.1', M_DEMANDA:'M0.2', F_SENSOR:'M0.3', F_TRANSB:'M0.4', F_BOMBA:'M0.5', F_CONTATOR:'M0.6', M_FALHA:'M0.7'
};
const DESC = {
  S_LL:'Sensor nível muito baixo (10%)', S_L:'Sensor nível baixo (30%) — pede enchimento', S_H:'Sensor nível alto (80%) — encerra enchimento',
  S_HH:'Sensor transbordo (92%) — segurança', BT_PARTIDA:'Botão partida (NA, pulso)', BT_PARADA:'Botão parada (NA; usado como NF na lógica)',
  BT_EMERG:'Emergência (cogumelo com trava)', BT_RESET:'Reset: toque = reconhece falhas; 5 s = zera contadores',
  CH_MANUAL:'Seletora: 0 = automático, 1 = manual', BT_BOMBA_MAN:'Botão bomba no modo manual (pulso)',
  FB_BOMBA:'Retorno do contator (contato auxiliar): bomba realmente ligada',
  BOMBA:'Bobina do contator da bomba', VALV_DRENO:'Válvula solenoide de dreno (volta à cisterna)', LUZ_VERDE:'Sinaleiro verde — operação normal',
  LUZ_AMARELA:'Sinaleiro amarelo — manutenção / nível crítico', LUZ_VERMELHA:'Sinaleiro vermelho piscante — alarme', SIRENE:'Sirene de alarme',
  LED_SISTEMA:'LED painel ligado', LED_BOMBA:'LED bomba girando (pelo retorno real)',
  M_SIST:'Sistema ligado (selo)', M_AUTO:'Modo automático ativo', M_DEMANDA:'Demanda de enchimento (histerese L→H)',
  F_SENSOR:'Falha: sensores inconsistentes', F_TRANSB:'Falha: transbordo (HH)', F_BOMBA:'Falha: bomba sem vazão (40 s)',
  F_CONTATOR:'Falha: contator não obedece ao comando', M_FALHA:'Falha geral (OU das falhas)'
};
const T = {
  T_BAIXO:{pt:2000, d:'Confirma nível abaixo de L (anti-onda)'}, T_ALTO:{pt:1000, d:'Confirma nível em H (anti-onda)'},
  T_SENSOR:{pt:2000, d:'Confirma inconsistência de sensores'}, T_MAXBOMBA:{pt:40000, d:'Tempo máximo de enchimento'},
  T_DISCREP:{pt:2000, d:'Comando ≠ retorno do contator'}, T_RST_LONGO:{pt:5000, d:'Reset segurado 5 s'},
  T_PISCA_A:{pt:500, d:'Oscilador 1 Hz (A)'}, T_PISCA_B:{pt:500, d:'Oscilador 1 Hz (B)'}
};
const C = {
  C_TRANSB:{pv:3, d:'Transbordos → bloqueio do sistema'}, C_PARTIDAS:{pv:5, d:'Partidas reais da bomba → manutenção'}
};
function resetPLC(){
  for (const k in V) V[k] = false;
  for (const k in T) Object.assign(T[k], {et:0, q:false, in:false});
  for (const k in C) Object.assign(C[k], {cv:0, q:false, prev:false});
}
function get(n){
  if (n.endsWith('.Q')) { const b = n.slice(0,-2); if (T[b]) return T[b].q; if (C[b]) return C[b].q; }
  return !!V[n];
}
const NO = v => ({k:'NO', v}), NC = v => ({k:'NC', v}), S = (...c) => ({k:'S', c}), P = (...c) => ({k:'P', c});
const RUNGS = [
  {g:'Comando geral', t:'Liga/desliga o sistema (contato de selo)', l:S(P(NO('BT_PARTIDA'),NO('M_SIST')),NC('BT_PARADA'),NC('BT_EMERG')), o:{k:'coil',v:'M_SIST'}},
  {g:'Comando geral', t:'Modo automático ativo', l:S(NO('M_SIST'),NC('CH_MANUAL')), o:{k:'coil',v:'M_AUTO'}},
  {g:'Controle de nível', t:'Filtro anti-onda: abaixo de L por 2 s', l:NC('S_L'), o:{k:'ton',v:'T_BAIXO'}},
  {g:'Controle de nível', t:'Filtro anti-onda: em H por 1 s', l:NO('S_H'), o:{k:'ton',v:'T_ALTO'}},
  {g:'Controle de nível', t:'Demanda de enchimento — histerese (liga abaixo de L, desliga em H)', l:S(P(NO('T_BAIXO.Q'),NO('M_DEMANDA')),NC('T_ALTO.Q')), o:{k:'coil',v:'M_DEMANDA'}},
  {g:'Diagnóstico', t:'Sensores em combinação fisicamente impossível', l:P(S(NO('S_L'),NC('S_LL')),S(NO('S_H'),NC('S_L')),S(NO('S_HH'),NC('S_H'))), o:{k:'ton',v:'T_SENSOR'}},
  {g:'Diagnóstico', t:'Falha de sensor — retida até RESET', l:P(NO('T_SENSOR.Q'),S(NO('F_SENSOR'),NC('BT_RESET'))), o:{k:'coil',v:'F_SENSOR'}},
  {g:'Diagnóstico', t:'Falha de transbordo — retida até RESET (só limpa abaixo de HH)', l:P(NO('S_HH'),S(NO('F_TRANSB'),NC('BT_RESET'))), o:{k:'coil',v:'F_TRANSB'}},
  {g:'Diagnóstico', t:'Supervisão do tempo de enchimento', l:S(NO('BOMBA'),NO('M_AUTO')), o:{k:'ton',v:'T_MAXBOMBA'}},
  {g:'Diagnóstico', t:'Falha bomba sem vazão — retida até RESET', l:P(NO('T_MAXBOMBA.Q'),S(NO('F_BOMBA'),NC('BT_RESET'))), o:{k:'coil',v:'F_BOMBA'}},
  {g:'Diagnóstico', t:'Discrepância: comando da bomba ≠ retorno do contator', l:P(S(NO('BOMBA'),NC('FB_BOMBA')),S(NC('BOMBA'),NO('FB_BOMBA'))), o:{k:'ton',v:'T_DISCREP'}},
  {g:'Diagnóstico', t:'Falha de contator (colado ou não fecha) — retida até RESET', l:P(NO('T_DISCREP.Q'),S(NO('F_CONTATOR'),NC('BT_RESET'))), o:{k:'coil',v:'F_CONTATOR'}},
  {g:'Diagnóstico', t:'Falha geral', l:P(NO('F_SENSOR'),NO('F_TRANSB'),NO('F_BOMBA'),NO('F_CONTATOR')), o:{k:'coil',v:'M_FALHA'}},
  {g:'Contadores', t:'Reset longo (5 s) = manutenção realizada', l:NO('BT_RESET'), o:{k:'ton',v:'T_RST_LONGO'}},
  {g:'Contadores', t:'Conta transbordos (3 = bloqueio)', l:NO('S_HH'), o:{k:'ctu',v:'C_TRANSB'}},
  {g:'Contadores', t:'Conta partidas reais da bomba (5 = manutenção)', l:NO('FB_BOMBA'), o:{k:'ctu',v:'C_PARTIDAS'}},
  {g:'Contadores', t:'Zera contador de transbordos (libera bloqueio)', l:NO('T_RST_LONGO.Q'), o:{k:'res',v:'C_TRANSB'}},
  {g:'Contadores', t:'Zera contador de partidas', l:NO('T_RST_LONGO.Q'), o:{k:'res',v:'C_PARTIDAS'}},
  {g:'Atuadores', t:'Bomba — intertravamentos + automático/manual', l:S(NO('M_SIST'),NC('S_HH'),NC('M_FALHA'),NC('C_TRANSB.Q'),P(S(NO('M_AUTO'),NO('M_DEMANDA')),S(NO('CH_MANUAL'),NO('BT_BOMBA_MAN')))), o:{k:'coil',v:'BOMBA'}},
  {g:'Atuadores', t:'Dreno — abre em HH confirmado por H, fecha abaixo de H', l:S(NO('S_H'),P(NO('S_HH'),NO('VALV_DRENO'))), o:{k:'coil',v:'VALV_DRENO'}},
  {g:'Sinalização', t:'Oscilador 1 Hz — A', l:NC('T_PISCA_B.Q'), o:{k:'ton',v:'T_PISCA_A'}},
  {g:'Sinalização', t:'Oscilador 1 Hz — B', l:NO('T_PISCA_A.Q'), o:{k:'ton',v:'T_PISCA_B'}},
  {g:'Sinalização', t:'Verde — operação normal', l:S(NO('M_SIST'),NC('M_FALHA'),NC('C_TRANSB.Q')), o:{k:'coil',v:'LUZ_VERDE'}},
  {g:'Sinalização', t:'Amarelo — manutenção pendente ou nível crítico', l:P(NO('C_PARTIDAS.Q'),S(NO('M_SIST'),NC('S_LL'))), o:{k:'coil',v:'LUZ_AMARELA'}},
  {g:'Sinalização', t:'Vermelho piscante — falha, bloqueio ou emergência', l:S(P(NO('M_FALHA'),NO('C_TRANSB.Q'),NO('BT_EMERG')),NO('T_PISCA_A.Q')), o:{k:'coil',v:'LUZ_VERMELHA'}},
  {g:'Sinalização', t:'Sirene', l:NO('M_FALHA'), o:{k:'coil',v:'SIRENE'}},
  {g:'Sinalização', t:'LED painel ligado', l:NO('M_SIST'), o:{k:'coil',v:'LED_SISTEMA'}},
  {g:'Sinalização', t:'LED bomba (estado real, pelo retorno)', l:NO('FB_BOMBA'), o:{k:'coil',v:'LED_BOMBA'}}
];
function ev(n, pin){
  n._in = pin; let o;
  if (n.k === 'NO') { n._c = get(n.v); o = pin && n._c; }
  else if (n.k === 'NC') { n._c = !get(n.v); o = pin && n._c; }
  else if (n.k === 'S') { o = pin; for (const c of n.c) o = ev(c, o); }
  else { o = false; for (const c of n.c) { const r = ev(c, pin); o = o || r; } }
  n._out = o; return o;
}
function scan(dt){
  for (const r of RUNGS) {
    const pw = ev(r.l, true); r.pw = pw; const o = r.o;
    if (o.k === 'coil') V[o.v] = pw;
    else if (o.k === 'ton') { const t = T[o.v]; t.in = pw; t.et = pw ? Math.min(t.et + dt, t.pt) : 0; t.q = pw && t.et >= t.pt; }
    else if (o.k === 'ctu') { const c = C[o.v]; if (pw && !c.prev) c.cv++; c.prev = pw; c.q = c.cv >= c.pv; }
    else if (o.k === 'res') { if (pw) { const c = C[o.v]; c.cv = 0; c.q = false; } }
  }
}
resetPLC();
