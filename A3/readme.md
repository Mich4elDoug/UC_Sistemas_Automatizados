
# 💧 Sistema Automatizado de Controle de Tanque de Água

Projeto da **A3** da disciplina **Sistemas Automatizados**, do curso de **Engenharia de Software** da **Universidade São Judas Tadeu (USJT)**, 2º semestre de 2026, sob orientação do **Prof. Robson Calvetti**.

O projeto implementa, em linguagem **Ladder**, um sistema que controla o nível de um tanque de água por meio de um **CLP (Controlador Lógico Programável)**. O sistema mantém o reservatório abastecido, detecta falhas em sensores, na bomba e no contator, e impede o transbordo mesmo quando algum componente falha.

---

## 📁 Estrutura do repositório

```
📦 Pasta principal
 ┣ 📄 README.md
 ┣ 📂 Edital
 ┃ ┗ 📄 Edital do projeto (PDF)
 ┣ 📂 Documentacao
 ┃ ┣ 📄 Relatório técnico do grupo (PDF)
 ┃ ┗ 📄 Programa Ladder do PLC Fiddle (.plcfiddle)
 ┗ 📂 Projeto
   ┣ 📄 index.html          → simulador visual do tanque
   ┣ 📂 css
   ┃ ┣ 📄 estilo.css
   ┃ ┗ 📄 fiddle.css
   ┗ 📂 js
     ┣ 📄 clp.js            → lógica do CLP (variáveis e 28 rungs)
     ┣ 📄 planta.js         → física do tanque e falhas injetáveis
     ┣ 📄 testes.js         → 12 testes automáticos
     ┣ 📄 interface.js      → parte visual do simulador
     ┗ 📄 fiddle.js         → parte visual do Ladder
```

| Pasta | Conteúdo |
|---|---|
| **Edital** | Edital oficial do projeto A3, com temas, entregáveis e rubrica de avaliação. |
| **Documentacao** | Relatório técnico do grupo em PDF (padrão ABNT) e o arquivo `.plcfiddle` com o programa Ladder completo, que pode ser aberto no [PLC Fiddle](https://www.plcfiddle.com/). |
| **Projeto** | Simulador web desenvolvido pelo grupo (HTML, CSS e JavaScript), que executa a mesma lógica Ladder programada no PLC Fiddle. |

---

## ⚙️ Como o sistema funciona

Uma bomba retira água de uma **cisterna** e enche um **tanque elevado**. Quatro sensores de nível do tipo boia informam ao CLP em que faixa está a água:

| Sensor | Posição | Função |
|---|---|---|
| **LL** | 10% | Indica nível crítico |
| **L** | 30% | Solicita o enchimento |
| **H** | 80% | Encerra o enchimento |
| **HH** | 92% | Proteção contra transbordo |

A bomba **liga abaixo de L e só desliga em H**. Essa técnica, chamada **histerese**, evita que a bomba fique ligando e desligando sem parar.

### Principais recursos
- 🔁 **Histerese com filtros de tempo** contra oscilações da água.
- 🛡️ **Intertravamentos**: o sensor HH desliga a bomba mesmo no modo manual.
- 🔍 **Diagnóstico de falhas**: detecta sensores com defeito, bomba sem vazão e contator colado ou que não fecha.
- 🔢 **Contadores**: 3 transbordos bloqueiam o sistema, e 5 partidas acendem o aviso de manutenção.
- 🚨 **Sinalização**: luzes verde, amarela e vermelha (piscante), além de sirene e LEDs do painel.
- 🕹️ **Modo manual** e **botão de emergência**.

### Programa Ladder
- **28 rungs** organizados em 6 blocos: comando geral, controle de nível, diagnóstico de falhas, contadores, atuadores e sinalização.
- **8 temporizadores (TON)** e **2 contadores (CTU)**.
- **11 entradas** e **8 saídas**.

---

## ▶️ Como executar

### No PLC Fiddle
1. Acesse [plcfiddle.com](https://www.plcfiddle.com/).
2. Abra o arquivo `.plcfiddle` da pasta **Documentacao**.
3. Clique nas entradas (OFF/ON) para simular sensores e botões. Para "encher" o tanque, ligue os sensores na ordem **LL → L → H → HH**.

### No simulador visual
1. Baixe a pasta **Projeto**.
2. Abra o arquivo `index.html` no navegador. Não é preciso instalar nada.
3. Clique em **PARTIDA** e acompanhe o tanque e o Ladder ao vivo.

**O que dá para fazer no simulador:**
- **Injetar falhas** pelo painel: sensor H travado, sensor HH travado, sensor L travado, sensor LL travado, bomba sem vazão, contator colado e contator que não fecha.
- **Executar os 12 testes automáticos** na aba *Testes de falhas*.
---

## ✅ Resultados

Os **12 cenários de teste** foram aprovados: 7 de falha e 5 de operação normal e segurança. Em nenhum cenário o nível ultrapassou **92,2%**, ou seja, o tanque não transbordou em nenhuma das situações simuladas.

---

## 🛠️ Tecnologias

- **PLC Fiddle**: programação e simulação Ladder.
- **HTML, CSS e JavaScript**: simulador visual.

---

## 👥 Autores

| Nome | RA | GitHub |
|---|---|---|
| Gustavo Xavier Figueredo | 823113981 | [@GuFinguer](https://github.com/GuFinguer) |
| Higor da Silva Santos | 823122154 | [@HigorH2k](https://github.com/HigorH2k) |
| Matheus Cunha da Silva | 823128178 | [@cunhaaw-eng](https://github.com/cunhaaw-eng) |
| Guilherme Pontes Santos | 823122036 | [@g-pontes](https://github.com/g-pontes) |
| Michael Douglas Braga | 823114204 | [@Mich4elDoug](https://github.com/Mich4elDoug/) |

---

<p align="center">
  Universidade São Judas Tadeu · Engenharia de Software · Sistemas Automatizados · 2026
</p>
