/**
 * casa-modelo.js — O modelo da casa (dados puros, sem Three.js e sem DOM).
 *
 * Tudo que o app sabe sobre a casa mora aqui: envelope, cômodos, portas,
 * janelas, pisos e situação de medição. O 3D, a planta 2D e o levantamento
 * são apenas três leituras deste mesmo objeto — por isso editar um cômodo
 * na planta atualiza o 3D e a ficha da casa ao mesmo tempo.
 *
 * Referencial: o mesmo do lote.
 *   x: esquerda (-) → direita (+)   |   z: fundo (-) → frente (+)   |   y: altura
 * Cada cômodo é um retângulo (x, z) = canto de menor valor, com largura w (x)
 * e profundidade d (z).
 */

import { CORES_COMODO, ROTEIRO_CAPTURA } from './config.js';

export const EPS = 0.001;
const TOL_EXTERNA = 0.16;

/** Medidas de partida — ESTIMADAS a partir da casa vagão (4,85 × 15 m). */
export const ENVELOPE_PADRAO = {
  x0: -1.45,
  x1: 3.35,
  z0: -6.5,
  z1: 8.5,
  altura: 2.9, // altura das paredes externas (até o telhado)
  peDireito: 2.7, // altura interna
  espExterna: 0.18,
  espInterna: 0.10,
};

/** Porta padrão e janela padrão, em metros. */
export const PORTA_PADRAO = { largura: 0.8, altura: 2.1 };
export const JANELA_PADRAO = { largura: 1.2, altura: 1.1, peitoril: 1.0 };

export const PISOS = {
  porcelanato: { nome: 'Porcelanato claro', cor: 0xd9d2c5, aspereza: 0.35 },
  ceramica: { nome: 'Cerâmica', cor: 0xc4a882, aspereza: 0.5 },
  madeira: { nome: 'Madeira / laminado', cor: 0xa97448, aspereza: 0.65 },
  cimento: { nome: 'Cimento queimado', cor: 0x9aa0a6, aspereza: 0.8 },
  vinilico: { nome: 'Vinílico', cor: 0xb9c2c9, aspereza: 0.45 },
  nao_definido: { nome: 'Não definido', cor: 0x7c8794, aspereza: 0.7 },
};

export const TIPOS_COMODO = {
  sala: 'Sala',
  quarto: 'Quarto',
  banheiro: 'Banheiro',
  cozinha: 'Cozinha',
  circulacao: 'Circulação',
  servico: 'Serviço',
  outro: 'Outro',
};

/**
 * Planta de partida. Os valores são estimativas coerentes com a casa vagão:
 * corredor do lado direito (sem janela) e cômodos do lado esquerdo, onde
 * ficam as janelas voltadas para o corredor externo de 2 m.
 */
export function criarCasaPadrao() {
  const rooms = [
    {
      id: 'sala',
      nome: 'Sala',
      tipo: 'sala',
      x: -1.35,
      z: 4.6,
      w: 2.95,
      d: 3.8,
      cor: CORES_COMODO[0],
      piso: 'porcelanato',
      status: 'estimado',
      notas: '',
      portas: [
        { parede: 'direita', inicio: 1.2, largura: 0.9, altura: 2.1 },
        { parede: 'frente', inicio: 0.35, largura: 0.9, altura: 2.1, externa: true },
      ],
      janelas: [{ parede: 'esquerda', inicio: 0.9, largura: 1.4, altura: 1.2, peitoril: 1.0 }],
    },
    {
      id: 'quarto1',
      nome: 'Quarto 1',
      tipo: 'quarto',
      x: -1.35,
      z: 1.6,
      w: 2.95,
      d: 3.0,
      cor: CORES_COMODO[1],
      piso: 'madeira',
      status: 'estimado',
      notas: '',
      portas: [{ parede: 'direita', inicio: 0.7, largura: 0.8, altura: 2.1 }],
      janelas: [{ parede: 'esquerda', inicio: 0.8, largura: 1.2, altura: 1.1, peitoril: 1.0 }],
    },
    {
      id: 'banheiro',
      nome: 'Banheiro',
      tipo: 'banheiro',
      x: -1.35,
      z: -0.4,
      w: 2.95,
      d: 2.0,
      cor: CORES_COMODO[2],
      piso: 'ceramica',
      status: 'estimado',
      notas: '',
      portas: [{ parede: 'direita', inicio: 0.9, largura: 0.7, altura: 2.1 }],
      janelas: [{ parede: 'esquerda', inicio: 0.9, largura: 0.6, altura: 0.6, peitoril: 1.6 }],
    },
    {
      id: 'quarto2',
      nome: 'Quarto 2',
      tipo: 'quarto',
      x: -1.35,
      z: -3.6,
      w: 2.95,
      d: 3.2,
      cor: CORES_COMODO[3],
      piso: 'madeira',
      status: 'estimado',
      notas: '',
      portas: [{ parede: 'direita', inicio: 0.9, largura: 0.8, altura: 2.1 }],
      janelas: [{ parede: 'esquerda', inicio: 0.8, largura: 1.2, altura: 1.1, peitoril: 1.0 }],
    },
    {
      id: 'cozinha',
      nome: 'Cozinha / copa',
      tipo: 'cozinha',
      x: -1.35,
      z: -6.4,
      w: 2.95,
      d: 2.8,
      cor: CORES_COMODO[4],
      piso: 'ceramica',
      status: 'estimado',
      notas: '',
      portas: [
        { parede: 'direita', inicio: 0.8, largura: 0.8, altura: 2.1 },
        { parede: 'fundo', inicio: 0.4, largura: 0.9, altura: 2.1, externa: true },
      ],
      janelas: [{ parede: 'esquerda', inicio: 0.7, largura: 1.2, altura: 1.1, peitoril: 1.1 }],
    },
    {
      id: 'corredor',
      nome: 'Corredor',
      tipo: 'circulacao',
      x: 1.6,
      z: -6.4,
      w: 1.65,
      d: 14.8,
      cor: CORES_COMODO[5],
      piso: 'ceramica',
      status: 'estimado',
      notas: '',
      portas: [],
      janelas: [],
    },
  ];
  return {
    versao: 1,
    envelope: { ...ENVELOPE_PADRAO },
    rooms,
    atualizadoEm: null,
  };
}

export function clonar(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function areaComodo(r) {
  return Math.max(0, r.w) * Math.max(0, r.d);
}

export function areaEnvelope(env) {
  return Math.max(0, env.x1 - env.x0) * Math.max(0, env.z1 - env.z0);
}

/** Arredonda para 5 cm, a precisão de uma trena comum. */
export function snap(v, passo = 0.05) {
  const fator = Math.round(1 / passo);
  return Math.round(v * fator) / fator;
}

export function numeroValido(v, minimo, maximo) {
  const n = Number(v);
  if (!Number.isFinite(n)) return minimo;
  return Math.min(maximo, Math.max(minimo, n));
}

/**
 * Limpa e completa uma casa vinda do localStorage/JSON.
 * Nunca lança: se vier lixo, devolve a planta padrão.
 */
export function normalizarCasa(bruta) {
  const padrao = criarCasaPadrao();
  if (!bruta || typeof bruta !== 'object' || !Array.isArray(bruta.rooms)) return padrao;
  const env = { ...ENVELOPE_PADRAO, ...(bruta.envelope || {}) };
  env.peDireito = numeroValido(env.peDireito, 2.2, 4.0);
  env.altura = numeroValido(env.altura, env.peDireito + 0.05, 5.0);
  env.x0 = numeroValido(env.x0, -100, 100);
  env.x1 = numeroValido(env.x1, env.x0 + 2, 100);
  env.z0 = numeroValido(env.z0, -200, 200);
  env.z1 = numeroValido(env.z1, env.z0 + 2, 200);
  env.espExterna = numeroValido(env.espExterna, 0.05, 0.6);
  env.espInterna = numeroValido(env.espInterna, 0.04, 0.5);

  const vistos = new Set();
  const rooms = bruta.rooms
    .filter((r) => r && typeof r === 'object' && typeof r.id === 'string' && r.id)
    .map((r, i) => {
      const id = vistos.has(r.id) ? `${r.id}-${i}` : r.id;
      vistos.add(id);
      const base = padrao.rooms.find((p) => p.id === r.id) || {};
      const t = TIPOS_COMODO[r.tipo] ? r.tipo : base.tipo || 'outro';
      return {
        id,
        nome: String(r.nome || base.nome || `Cômodo ${i + 1}`).slice(0, 60),
        tipo: t,
        x: numeroValido(r.x ?? base.x ?? env.x0, env.x0 - 1, env.x1 + 1),
        z: numeroValido(r.z ?? base.z ?? env.z0, env.z0 - 1, env.z1 + 1),
        w: numeroValido(r.w ?? base.w ?? 2, 0.6, 40),
        d: numeroValido(r.d ?? base.d ?? 2, 0.6, 60),
        cor: /^#[0-9a-f]{6}$/i.test(r.cor || '') ? r.cor : base.cor || CORES_COMODO[i % CORES_COMODO.length],
        piso: PISOS[r.piso] ? r.piso : base.piso || 'nao_definido',
        status: r.status === 'medido' ? 'medido' : 'estimado',
        notas: String(r.notas || '').slice(0, 500),
        portas: normalizarAberturas(r.portas, false, base.portas),
        janelas: normalizarAberturas(r.janelas, true, base.janelas),
        mobilia: typeof r.mobilia === 'boolean' ? r.mobilia : true,
      };
    });

  if (rooms.length === 0) return padrao;
  return { versao: 1, envelope: env, rooms, atualizadoEm: bruta.atualizadoEm || null };
}

function normalizarAberturas(lista, ehJanela, padrao) {
  const fonte = Array.isArray(lista) ? lista : Array.isArray(padrao) ? padrao : [];
  return fonte
    .filter((a) => a && typeof a === 'object')
    .map((a) => {
      const parede = ['frente', 'fundo', 'esquerda', 'direita'].includes(a.parede) ? a.parede : 'esquerda';
      const base = ehJanela ? JANELA_PADRAO : PORTA_PADRAO;
      return {
        parede,
        inicio: numeroValido(a.inicio ?? 0.5, 0, 50),
        largura: numeroValido(a.largura ?? base.largura, 0.3, 6),
        altura: numeroValido(a.altura ?? base.altura, 0.3, 2.8),
        peitoril: ehJanela ? numeroValido(a.peitoril ?? JANELA_PADRAO.peitoril, 0, 2.4) : 0,
        ...(a.externa ? { externa: true } : {}),
      };
    })
    .slice(0, 8);
}

/**
 * Comprimento da parede de um cômodo e o eixo em que ela corre.
 * Serve para posicionar portas/janelas e desenhar a planta.
 */
export function paredeDoComodo(room, parede) {
  switch (parede) {
    case 'frente':
      // +z é o lado da rua, então a frente do cômodo é a aresta de maior z.
      return { eixo: 'h', coord: room.z + room.d, ini: room.x, fim: room.x + room.w, comprimento: room.w };
    case 'fundo':
      return { eixo: 'h', coord: room.z, ini: room.x, fim: room.x + room.w, comprimento: room.w };
    case 'esquerda':
      return { eixo: 'v', coord: room.x, ini: room.z, fim: room.z + room.d, comprimento: room.d };
    case 'direita':
      return { eixo: 'v', coord: room.x + room.w, ini: room.z, fim: room.z + room.d, comprimento: room.d };
    default:
      return null;
  }
}

/** Intervalo absoluto (em metros, no eixo da parede) de uma porta ou janela. */
export function intervaloAbertura(room, abertura) {
  const p = paredeDoComodo(room, abertura.parede);
  if (!p) return null;
  const ini = p.ini + abertura.inicio;
  return { ini, fim: ini + abertura.largura, eixo: p.eixo, coord: p.coord };
}

function ehCoordenadaExterna(eixo, coord, env) {
  if (eixo === 'h') return Math.abs(coord - env.z0) <= TOL_EXTERNA || Math.abs(coord - env.z1) <= TOL_EXTERNA;
  return Math.abs(coord - env.x0) <= TOL_EXTERNA || Math.abs(coord - env.x1) <= TOL_EXTERNA;
}

function encaixarNaBorda(eixo, coord, env) {
  if (eixo === 'h') {
    if (Math.abs(coord - env.z0) <= TOL_EXTERNA) return env.z0;
    if (Math.abs(coord - env.z1) <= TOL_EXTERNA) return env.z1;
  } else {
    if (Math.abs(coord - env.x0) <= TOL_EXTERNA) return env.x0;
    if (Math.abs(coord - env.x1) <= TOL_EXTERNA) return env.x1;
  }
  return coord;
}

/**
 * Gera a malha de paredes: junta arestas coincidentes (paredes compartilhadas
 * viram uma só), recorta portas e janelas e devolve blocos prontos para o 3D.
 *
 * Cada bloco: { eixo, coord, ini, fim, yBase, yTopo, espessura, externa, comodos, tipo }
 * eixo 'h' = corre em x no z=coord; eixo 'v' = corre em z no x=coord.
 */
export function redeDeParedes(casa, opcoes = {}) {
  const env = casa.envelope;
  const incluirExternas = opcoes.incluirExternas !== false;
  const grupos = new Map();

  const adicionar = (aresta) => {
    const coord = encaixarNaBorda(aresta.eixo, aresta.coord, env);
    const externa = ehCoordenadaExterna(aresta.eixo, coord, env);
    const chave = `${aresta.eixo}:${coord.toFixed(3)}`;
    if (!grupos.has(chave)) grupos.set(chave, { eixo: aresta.eixo, coord, externa, arestas: [] });
    const g = grupos.get(chave);
    if (externa) g.externa = true;
    g.arestas.push({ ...aresta, coord, externa });
  };

  for (const room of casa.rooms) {
    for (const parede of ['frente', 'fundo', 'esquerda', 'direita']) {
      const p = paredeDoComodo(room, parede);
      if (!p) continue;
      const aberturas = [];
      for (const j of room.janelas) {
        if (j.parede !== parede) continue;
        const iv = intervaloAbertura(room, j);
        if (iv) aberturas.push({ ini: iv.ini, fim: iv.fim, peitoril: j.peitoril, topo: j.peitoril + j.altura });
      }
      for (const p2 of room.portas) {
        if (p2.parede !== parede) continue;
        const iv = intervaloAbertura(room, p2);
        if (iv) aberturas.push({ ini: iv.ini, fim: iv.fim, peitoril: 0, topo: p2.altura });
      }
      adicionar({ eixo: p.eixo, coord: p.coord, ini: p.ini, fim: p.fim, comodo: room.id, aberturas });
    }
  }

  const blocos = [];
  for (const g of grupos.values()) {
    if (g.externa && !incluirExternas) continue;
    let limiteMin = Math.min(...g.arestas.map((a) => a.ini));
    let limiteMax = Math.max(...g.arestas.map((a) => a.fim));
    const arestas = [...g.arestas];
    if (g.externa) {
      // A parede externa é contínua: fecha os cantos e os vãos entre cômodos.
      if (g.eixo === 'h') {
        limiteMin = env.x0;
        limiteMax = env.x1;
      } else {
        limiteMin = env.z0;
        limiteMax = env.z1;
      }
      arestas.push({ eixo: g.eixo, coord: g.coord, ini: limiteMin, fim: limiteMax, comodo: null, aberturas: [] });
    }
    if (limiteMax - limiteMin < EPS) continue;

    const cortes = new Set([limiteMin, limiteMax]);
    for (const a of arestas) {
      cortes.add(clamp(a.ini, limiteMin, limiteMax));
      cortes.add(clamp(a.fim, limiteMin, limiteMax));
      for (const ab of a.aberturas) {
        cortes.add(clamp(ab.ini, limiteMin, limiteMax));
        cortes.add(clamp(ab.fim, limiteMin, limiteMax));
      }
    }
    const pontos = [...cortes].sort((a, b) => a - b);
    const altura = g.externa ? env.altura : env.peDireito;
    const espessura = g.externa ? env.espExterna : env.espInterna;

    for (let i = 0; i < pontos.length - 1; i++) {
      const ini = pontos[i];
      const fim = pontos[i + 1];
      if (fim - ini < 0.03) continue;
      const meio = (ini + fim) / 2;
      const coberturas = arestas.filter((a) => a.ini - EPS <= meio && a.fim + EPS >= meio);
      if (coberturas.length === 0) continue;

      // Aberturas que cobrem este trecho (união entre os dois lados da parede).
      const aberturas = coberturas
        .flatMap((a) => a.aberturas)
        .filter((ab) => ab.ini - EPS <= meio && ab.fim + EPS >= meio);
      const abertura = aberturas.sort((a, b) => b.topo - a.topo)[0] || null;
      const comodos = [...new Set(coberturas.map((a) => a.comodo).filter(Boolean))];

      const base = { eixo: g.eixo, coord: g.coord, ini, fim, espessura, externa: g.externa, comodos };

      if (!abertura) {
        blocos.push({ ...base, yBase: 0, yTopo: altura, tipo: 'parede' });
        continue;
      }
      if (abertura.peitoril > 0.03) {
        blocos.push({ ...base, yBase: 0, yTopo: Math.min(abertura.peitoril, altura), tipo: 'peitoril' });
      }
      if (abertura.topo < altura - 0.03) {
        blocos.push({ ...base, yBase: Math.max(abertura.topo, 0), yTopo: altura, tipo: 'verga' });
      }
    }
  }
  return blocos;
}

/**
 * Portas/janelas prontas para desenhar (vidro, batente e arco na planta).
 * Devolve as aberturas já recortadas pelos limites da parede.
 */
export function aberturasVisiveis(casa) {
  const saida = [];
  for (const room of casa.rooms) {
    for (const tipo of ['portas', 'janelas']) {
      for (const a of room[tipo]) {
        const p = paredeDoComodo(room, a.parede);
        const iv = intervaloAbertura(room, a);
        if (!p || !iv) continue;
        const ini = Math.max(iv.ini, p.ini);
        const fim = Math.min(iv.fim, p.fim);
        if (fim - ini < 0.05) continue;
        const coord = encaixarNaBorda(p.eixo, p.coord, casa.envelope);
        saida.push({
          comodo: room.id,
          tipo: tipo === 'portas' ? 'porta' : 'janela',
          parede: a.parede,
          eixo: p.eixo,
          coord,
          ini,
          fim,
          largura: fim - ini,
          altura: a.altura,
          peitoril: tipo === 'janelas' ? a.peitoril : 0,
          externa: ehCoordenadaExterna(p.eixo, coord, casa.envelope),
        });
      }
    }
  }
  return saida;
}

function clamp(v, a, b) {
  return Math.min(b, Math.max(a, v));
}

/** Cômodo que contém o ponto (x, z), ou null. */
export function comodoNoPonto(casa, x, z) {
  for (let i = casa.rooms.length - 1; i >= 0; i--) {
    const r = casa.rooms[i];
    if (x >= r.x - EPS && x <= r.x + r.w + EPS && z >= r.z - EPS && z <= r.z + r.d + EPS) return r;
  }
  return null;
}

/** Mantém o cômodo dentro do envelope (com 5 cm de folga). */
export function limitarAoEnvelope(room, env) {
  const folga = 0.02;
  room.w = numeroValido(room.w, 0.6, env.x1 - env.x0 - 2 * folga);
  room.d = numeroValido(room.d, 0.6, env.z1 - env.z0 - 2 * folga);
  room.x = numeroValido(room.x, env.x0 + folga, env.x1 - folga - room.w);
  room.z = numeroValido(room.z, env.z0 + folga, env.z1 - folga - room.d);
  return room;
}

/**
 * Diagnóstico da planta: sobreposição entre cômodos, área não coberta e
 * cômodos que saíram do envelope. Usado no Levantamento e na planta 2D.
 */
export function diagnosticarPlanta(casa) {
  const env = casa.envelope;
  const avisos = [];
  let sobreposicao = 0;
  for (let i = 0; i < casa.rooms.length; i++) {
    for (let j = i + 1; j < casa.rooms.length; j++) {
      const a = casa.rooms[i];
      const b = casa.rooms[j];
      const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const iz = Math.min(a.z + a.d, b.z + b.d) - Math.max(a.z, b.z);
      if (ix > 0.03 && iz > 0.03) {
        sobreposicao += ix * iz;
        avisos.push(`"${a.nome}" e "${b.nome}" se sobrepõem (${(ix * iz).toFixed(1)} m²).`);
      }
    }
  }

  // Amostragem em grade para achar área do envelope sem cômodo.
  const passo = 0.2;
  let livres = 0;
  let total = 0;
  const recuo = 0.12;
  const xIni = env.x0 + recuo;
  const xFim = env.x1 - recuo;
  const zIni = env.z0 + recuo;
  const zFim = env.z1 - recuo;
  for (let x = xIni + passo / 2; x < xFim; x += passo) {
    for (let z = zIni + passo / 2; z < zFim; z += passo) {
      total++;
      if (!comodoNoPonto(casa, x, z)) livres++;
    }
  }
  const areaAmostrada = Math.max(0.001, (xFim - xIni) * (zFim - zIni));
  const areaLivre = (livres / Math.max(1, total)) * areaAmostrada;
  if (areaLivre > 1.0) {
    avisos.push(`Cerca de ${areaLivre.toFixed(1)} m² do envelope ainda não pertencem a nenhum cômodo.`);
  }
  for (const r of casa.rooms) {
    if (r.x < env.x0 - 0.05 || r.z < env.z0 - 0.05 || r.x + r.w > env.x1 + 0.05 || r.z + r.d > env.z1 + 0.05) {
      avisos.push(`"${r.nome}" está fora dos limites da casa.`);
    }
  }
  return { avisos, sobreposicao: +sobreposicao.toFixed(2), areaLivre: +areaLivre.toFixed(1) };
}

/**
 * Completude de cada cômodo, de 0 a 100.
 * A ideia: o app mostra exatamente o que falta para a casa estar "levantada".
 */
export function completudeComodo(room, fotos = 0) {
  const roteiro = ROTEIRO_CAPTURA[room.id] || { alvo: 6 };
  const alvo = roteiro.alvo || 6;
  const circulacao = room.tipo === 'circulacao';
  const checks = [
    { id: 'medido', rotulo: 'Medidas conferidas na trena', peso: 25, ok: room.status === 'medido' },
    { id: 'portas', rotulo: 'Portas registradas', peso: 10, ok: room.portas.length > 0, aplicavel: !circulacao },
    { id: 'janelas', rotulo: 'Janelas registradas', peso: 10, ok: room.janelas.length > 0, aplicavel: !circulacao },
    { id: 'piso', rotulo: 'Piso definido', peso: 15, ok: room.piso && room.piso !== 'nao_definido' },
    {
      id: 'fotos',
      rotulo: `Fotos do cômodo (${fotos}/${alvo})`,
      peso: 30,
      ok: fotos >= alvo,
      parcial: Math.min(1, fotos / alvo),
    },
    { id: 'notas', rotulo: 'Anotações (o que reformar)', peso: 10, ok: room.notas.trim().length > 3 },
  ];
  let soma = 0;
  let pesoTotal = 0;
  let pesoFeito = 0;
  for (const c of checks) {
    soma += c.peso;
    if (c.aplicavel === false) continue;
    pesoTotal += c.peso;
    pesoFeito += c.peso * (c.parcial ?? (c.ok ? 1 : 0));
  }
  const score = pesoTotal ? Math.round((pesoFeito / pesoTotal) * 100) : 0;
  return { score, checks, soma };
}

export function completudeCasa(casa, fotosPorComodo = {}) {
  let pesoTotal = 0;
  let pesoFeito = 0;
  const comodos = casa.rooms.map((r) => {
    const c = completudeComodo(r, fotosPorComodo[r.id] || 0);
    const peso = Math.max(1, areaComodo(r));
    pesoTotal += peso;
    pesoFeito += peso * (c.score / 100);
    return { ...c, id: r.id, nome: r.nome, area: +areaComodo(r).toFixed(1) };
  });
  return { geral: pesoTotal ? Math.round((pesoFeito / pesoTotal) * 100) : 0, comodos };
}

/** Números da ficha da casa. */
export function estatisticas(casa) {
  const env = casa.envelope;
  let areaComodos = 0;
  let areaCirculacao = 0;
  let areaJanelas = 0;
  let portas = 0;
  let janelas = 0;
  let paredes = 0;
  for (const r of casa.rooms) {
    const a = areaComodo(r);
    areaComodos += a;
    if (r.tipo === 'circulacao') areaCirculacao += a;
    for (const j of r.janelas) {
      areaJanelas += j.largura * j.altura;
      janelas++;
    }
    portas += r.portas.length;
  }
  const rede = redeDeParedes(casa);
  for (const b of rede) {
    if (b.tipo === 'parede') paredes += b.fim - b.ini;
  }
  const envArea = areaEnvelope(env);
  return {
    areaEnvelope: +envArea.toFixed(1),
    areaComodos: +areaComodos.toFixed(1),
    areaCirculacao: +areaCirculacao.toFixed(1),
    areaJanelas: +areaJanelas.toFixed(2),
    portas,
    janelas,
    comprimentoParedes: +paredes.toFixed(1),
    peDireito: env.peDireito,
    largura: +(env.x1 - env.x0).toFixed(2),
    comprimento: +(env.z1 - env.z0).toFixed(2),
    ocupacao: envArea ? Math.min(100, Math.round((areaComodos / envArea) * 100)) : 0,
  };
}

/** Próximas ações concretas para completar a casa (usadas no Levantamento). */
export function pendencias(casa, fotosPorComodo = {}) {
  const itens = [];
  for (const r of casa.rooms) {
    const c = completudeComodo(r, fotosPorComodo[r.id] || 0);
    for (const check of c.checks) {
      if (check.aplicavel === false) continue;
      if (check.ok) continue;
      itens.push({
        comodoId: r.id,
        comodo: r.nome,
        texto:
          check.id === 'fotos'
            ? `Fotografar ${r.nome} (faltam ${Math.max(1, (ROTEIRO_CAPTURA[r.id]?.alvo || 6) - (fotosPorComodo[r.id] || 0))} fotos)`
            : `${check.rotulo} — ${r.nome}`,
        acao: check.id === 'fotos' ? 'captura' : check.id === 'medido' ? 'medir' : 'editar',
      });
    }
  }
  if (!itens.some((i) => i.acao === 'medir')) {
    itens.push({ comodoId: null, comodo: 'Casa', texto: 'Conferir se o pé-direito medido é 2,70 m', acao: 'editar' });
  }
  return itens;
}

/**
 * Colisão do passeio: um círculo (o visitante) contra as paredes (AABBs).
 * Devolve `true` se o ponto encostar em alguma parede.
 */
export function colide(colisores, x, z, raio = 0.22) {
  for (const c of colisores) {
    const maisPertoX = Math.max(c.x0, Math.min(x, c.x1));
    const maisPertoZ = Math.max(c.z0, Math.min(z, c.z1));
    const dx = x - maisPertoX;
    const dz = z - maisPertoZ;
    if (dx * dx + dz * dz < raio * raio) return true;
  }
  return false;
}

/**
 * Move em X e Z separadamente, permitindo deslizar pela parede em vez de
 * travar de vez (o clássico "encostou e parou"). Devolve a posição final.
 */
export function moverComColisao(colisores, x, z, dx, dz, raio = 0.22) {
  let nx = x;
  let nz = z;
  if (!colide(colisores, x + dx, z, raio)) nx = x + dx;
  if (!colide(colisores, nx, z + dz, raio)) nz = z + dz;
  return { x: nx, z: nz };
}

