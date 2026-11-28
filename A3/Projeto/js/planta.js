// PLANTA SIMULADA: física do tanque, sensores e falhas injetáveis (o 'mundo real' que o CLP lê).
// Projeto A3 — Sistemas Automatizados — Controle de Tanque de Água

// ===== PLANTA FÍSICA (o "mundo real" que o CLP não controla) =====
const FAULTS = {
  Hoff:   {n:'Sensor H travado desligado', d:'Boia H presa embaixo: a bomba não recebe ordem de parar.'},
  HHon:   {n:'Sensor HH travado ligado', d:'Falso alarme de transbordo com o tanque normal.'},
  Lon:    {n:'Sensor L travado ligado', d:'Boia L presa em cima: o CLP acha que há água.'},
  LLoff:  {n:'Sensor LL travado desligado', d:'Boia LL presa embaixo com o tanque cheio.'},
  noflow: {n:'Bomba sem vazão', d:'Motor gira mas não bombeia (cisterna vazia, ar, rotor).'},
  weld:   {n:'Contator colado', d:'O CLP manda desligar, mas a bomba continua ligada.'},
  noclose:{n:'Contator não fecha', d:'O CLP manda ligar, mas a bomba não parte.'}
};
const SIM = { level: 50, cons: 1.5, t: 0, fault: {} };
function clearFaults(){ for (const k in FAULTS) SIM.fault[k] = false; }
clearFaults();
function step(dt){
  const s = dt / 1000; SIM.t += dt; const f = SIM.fault;
  const running = f.weld ? true : (f.noclose ? false : V.BOMBA);   // contator físico
  SIM.running = running;
  const inflow = running && !f.noflow ? PHYS.bomba : 0;
  const out = SIM.level > 0 ? SIM.cons : 0;
  const dr = V.VALV_DRENO ? PHYS.dreno : 0;
  SIM.level = Math.max(0, Math.min(100, SIM.level + (inflow - out - dr) * s));
  V.S_LL = f.LLoff ? false : SIM.level >= LEVELS.S_LL;
  V.S_L  = f.Lon ? true : SIM.level >= LEVELS.S_L;
  V.S_H  = f.Hoff ? false : SIM.level >= LEVELS.S_H;
  V.S_HH = f.HHon ? true : SIM.level >= LEVELS.S_HH;
  V.FB_BOMBA = running;
  scan(dt);
}
