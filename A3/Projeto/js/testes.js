// TESTES AUTOMÁTICOS: 12 cenários de falha com resultado esperado.
// Projeto A3 — Sistemas Automatizados — Controle de Tanque de Água

// ===== ROTEIRO DE TESTES AUTOMÁTICOS =====
function setup(level, cons, faults){ resetPLC(); clearFaults(); SIM.level = level; SIM.cons = cons; SIM.t = 0; for (const k of (faults||[])) SIM.fault[k] = true; step(50); }
function run(sec, cb){ for (let i = 0; i < sec * 20; i++) { step(50); if (cb) cb(); } }
function press(name, sec = 0.2){ V[name] = true; run(sec); V[name] = false; run(0.1); }
const fmt = x => x.toFixed(1).replace('.', ',');
const TESTS = [
  {id:'partida', n:'Partida, selo e parada', f:[], lv:50, cons:0,
   d:'Pulso em PARTIDA mantém o sistema ligado; pulso em PARADA desliga.',
   r(){ setup(50,0); press('BT_PARTIDA'); run(1); const a = V.M_SIST; press('BT_PARADA'); const b = V.M_SIST;
        return [[a, 'Após soltar PARTIDA o sistema continua ligado (selo)', `M_SIST = ${a}`], [!b, 'PARADA desliga o sistema', `M_SIST = ${b}`]]; }},
  {id:'hist', n:'Histerese (operação normal)', f:[], lv:50, cons:1.5,
   d:'Bomba liga só abaixo de L e desliga só em H — sem liga/desliga repetido.',
   r(){ setup(50,1.5); press('BT_PARTIDA'); let mn=100,mx=0,st=0,p=false; run(240,()=>{mn=Math.min(mn,SIM.level);mx=Math.max(mx,SIM.level);if(V.BOMBA&&!p)st++;p=V.BOMBA;});
        return [[mn>25&&mn<32, 'Nível mínimo fica perto de L (30%)', `mínimo ${fmt(mn)}%`], [mx>79&&mx<86, 'Nível máximo fica perto de H (80%)', `máximo ${fmt(mx)}%`],
                [st<=6, 'Poucas partidas em 4 min (sem chattering)', `${st} partidas`], [!V.M_FALHA, 'Nenhuma falha', `M_FALHA = ${V.M_FALHA}`]]; }},
  {id:'Hoff', n:'Sensor H travado desligado', f:['Hoff'], lv:25, cons:1,
   d:'A bomba não recebe ordem de parar em H. O HH corta a bomba e registra falha de transbordo; três ocorrências bloqueiam o sistema até o reset de 5 s.',
   r(){ setup(25,1,['Hoff']); press('BT_PARTIDA'); let mx=0; run(45,()=>mx=Math.max(mx,SIM.level)); const fs = V.F_SENSOR, ft = V.F_TRANSB, f1 = fs||ft, bomba = V.BOMBA;
        for (let i=0;i<2;i++){ press('BT_RESET'); run(45,()=>mx=Math.max(mx,SIM.level)); } const bl = C.C_TRANSB.q;
        press('BT_RESET'); run(20,()=>mx=Math.max(mx,SIM.level)); const still = !V.BOMBA;
        V.BT_RESET = true; run(5.3); V.BT_RESET = false; run(0.2);
        return [[f1, 'Falha detectada no 1º transbordo', `F_SENSOR = ${fs}, F_TRANSB = ${ft}`], [!bomba, 'Bomba cortada pelo HH', `BOMBA = ${bomba}`],
                [mx < 100, 'Tanque nunca transborda', `nível máximo ${fmt(mx)}%`], [bl && still, '3º transbordo bloqueia; reset curto não libera', `C_TRANSB.Q = ${bl}`],
                [!C.C_TRANSB.q && C.C_TRANSB.cv===0, 'Reset de 5 s zera o contador e libera', `CV = ${C.C_TRANSB.cv}`]]; }},
  {id:'HHon', n:'Sensor HH travado ligado', f:['HHon'], lv:50, cons:0.5,
   d:'Falso transbordo: a bomba é bloqueada, mas o dreno NÃO abre porque H não confirma — o tanque não é esvaziado à toa.',
   r(){ setup(50,0.5,['HHon']); press('BT_PARTIDA'); let dr=false; run(10,()=>dr=dr||V.VALV_DRENO);
        return [[V.F_SENSOR, 'Inconsistência HH sem H detectada', `F_SENSOR = ${V.F_SENSOR}`], [!dr, 'Dreno não abre (sem confirmação de H)', `VALV_DRENO abriu = ${dr}`],
                [!V.BOMBA, 'Bomba bloqueada', `BOMBA = ${V.BOMBA}`], [V.SIRENE, 'Sirene ativa', `SIRENE = ${V.SIRENE}`]]; }},
  {id:'Lon', n:'Sensor L travado ligado', f:['Lon'], lv:40, cons:2,
   d:'O CLP não percebe o nível baixo. Quando a água passa abaixo de LL, a combinação L sem LL denuncia o defeito.',
   r(){ setup(40,2,['Lon']); press('BT_PARTIDA'); let t=null; run(30,()=>{ if(V.F_SENSOR&&t===null) t=SIM.t; });
        return [[V.F_SENSOR, 'Falha de sensor detectada', `F_SENSOR = ${V.F_SENSOR}`], [V.LUZ_AMARELA, 'Amarelo indica nível crítico', `LUZ_AMARELA = ${V.LUZ_AMARELA}`]]; }},
  {id:'LLoff', n:'Sensor LL travado desligado', f:['LLoff'], lv:50, cons:0.5,
   d:'Com o tanque a 50%, L ativo e LL inativo é impossível: falha em ~2 s.',
   r(){ setup(50,0.5,['LLoff']); press('BT_PARTIDA'); let t=null; run(5,()=>{ if(V.F_SENSOR&&t===null) t=SIM.t; });
        return [[V.F_SENSOR, 'Falha de sensor detectada', `após ${t?fmt(t/1000):'—'} s`]]; }},
  {id:'noflow', n:'Bomba sem vazão', f:['noflow'], lv:40, cons:0.5,
   d:'A bomba liga mas o nível não sobe. Após 40 s sem atingir H, o CLP desliga a bomba para não queimá-la.',
   r(){ setup(40,0.5,['noflow']); press('BT_PARTIDA'); let on=null, off=null; run(90,()=>{ if(V.BOMBA&&on===null) on=SIM.t; if(V.F_BOMBA&&off===null) off=SIM.t; });
        return [[V.F_BOMBA, 'Falha de bomba detectada', `${on&&off?fmt((off-on)/1000):'—'} s após ligar`], [!V.BOMBA, 'Bomba desligada', `BOMBA = ${V.BOMBA}`]]; }},
  {id:'weld', n:'Contator colado', f:['weld'], lv:70, cons:0.5,
   d:'O CLP manda desligar, mas a bomba segue ligada. O retorno do contator denuncia a falha e o dreno segura o nível.',
   r(){ setup(70,0.5,['weld']); press('BT_PARTIDA'); let mx=0, dr=false; run(60,()=>{ mx=Math.max(mx,SIM.level); dr=dr||V.VALV_DRENO; });
        return [[V.F_CONTATOR, 'Falha de contator detectada (comando ≠ retorno)', `F_CONTATOR = ${V.F_CONTATOR}`], [dr, 'Dreno abre ao atingir HH', `abriu = ${dr}`],
                [mx < 100, 'Tanque não transborda mesmo com a bomba sem controle', `nível máximo ${fmt(mx)}%`]]; }},
  {id:'noclose', n:'Contator não fecha', f:['noclose'], lv:25, cons:0.5,
   d:'O CLP manda ligar a bomba, mas nada acontece. Em 2 s a discrepância vira falha.',
   r(){ setup(25,0.5,['noclose']); press('BT_PARTIDA'); let on=null, f=null; run(10,()=>{ if(V.BOMBA&&on===null) on=SIM.t; if(V.F_CONTATOR&&f===null) f=SIM.t; });
        return [[V.F_CONTATOR, 'Falha de contator detectada', `${on&&f?fmt((f-on)/1000):'—'} s após o comando`], [!V.BOMBA, 'Comando da bomba retirado', `BOMBA = ${V.BOMBA}`]]; }},
  {id:'manual', n:'Manual não ultrapassa HH', f:[], lv:85, cons:0,
   d:'Mesmo segurando o botão de bomba manual, o HH corta a bomba (intertravamento).',
   r(){ setup(85,0); press('BT_PARTIDA'); V.CH_MANUAL = true; V.BT_BOMBA_MAN = true; let mx=0; run(8,()=>mx=Math.max(mx,SIM.level)); const b = V.BOMBA; V.BT_BOMBA_MAN = false;
        return [[!b, 'Bomba cortada com o botão ainda pressionado', `BOMBA = ${b}`], [mx < 95, 'Nível limitado logo acima de HH', `máximo ${fmt(mx)}%`]]; }},
  {id:'emerg', n:'Emergência', f:[], lv:20, cons:0.5,
   d:'Emergência derruba o sistema e a bomba; ao destravar, só volta com nova PARTIDA.',
   r(){ setup(20,0.5); press('BT_PARTIDA'); run(4); const b0 = V.BOMBA; V.BT_EMERG = true; run(0.5); const b1 = V.BOMBA, s1 = V.M_SIST; V.BT_EMERG = false; run(1);
        return [[b0, 'Bomba ligada antes da emergência', `BOMBA = ${b0}`], [!b1 && !s1, 'Emergência desliga sistema e bomba', `M_SIST = ${s1}, BOMBA = ${b1}`],
                [!V.M_SIST, 'Destravar não religa sozinho', `M_SIST = ${V.M_SIST}`]]; }},
  {id:'manut', n:'Aviso de manutenção', f:[], lv:28, cons:3,
   d:'A cada 5 partidas reais da bomba acende o amarelo; reset de 5 s zera.',
   r(){ setup(28,3); press('BT_PARTIDA'); run(200); const y = V.LUZ_AMARELA && C.C_PARTIDAS.q; const cv = C.C_PARTIDAS.cv;
        V.BT_RESET = true; run(5.3); V.BT_RESET = false; run(0.2);
        return [[y, '5 partidas acendem o amarelo', `CV = ${cv}`], [C.C_PARTIDAS.cv === 0, 'Reset de 5 s zera o contador', `CV = ${C.C_PARTIDAS.cv}`]]; }}
];
function runTest(t){ const res = t.r().map(([ok, what, obs]) => ({ok:!!ok, what, obs})); return {ok: res.every(x => x.ok), res}; }
resetPLC();
