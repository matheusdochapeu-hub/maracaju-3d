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
import { gerarMoveisIniciaisDaCasa, normalizarMovel } from './moveis-catalogo.js';

export const EPS = 0.001;
const TOL_EXTERNA = 0.16;

/**
 * Envelope real da Casa Maracaju 88, tirado da planta 1:100:
 * 5,00 × 19,00 m internos, paredes externas de 0,20 m.
 * As coordenadas são as linhas de centro das paredes (como no resto do app).
 */
export const ENVELOPE_PADRAO = {
  x0: -1.85,
  x1: 3.35,
  z0: -10.05,
  z1: 9.15,
  altura: 2.9,
  peDireito: 2.7,
  espExterna: 0.2,
  espInterna: 0.15,
};

/** Porta padrão e janela padrão, em metros. */
export const PORTA_PADRAO = { largura: 0.8, altura: 2.1 };
export const JANELA_PADRAO = { largura: 1.2, altura: 1.1, peitoril: 1.0 };

export const PISOS = {
  porcelanato: { nome: 'Porcelanato claro', cor: 0xd9d2c5, aspereza: 0.35 },
  ceramica: { nome: 'Cerâmica', cor: 0xc4a882, aspereza: 0.5 },
  ceramica_rosa: { nome: 'Cerâmica rosa', cor: 0xf4a8c7, aspereza: 0.45 },
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
  varanda: 'Varanda / alpendre',
  servico: 'Serviço',
  outro: 'Outro',
};

/**
 * Planta de partida. Os valores são estimativas coerentes com a casa vagão:
 * corredor do lado direito (sem janela) e cômodos do lado esquerdo, onde
 * ficam as janelas voltadas para o corredor externo de 2 m.
 */
/**
 * Planta de emergência, usada só se app/data/casa.json não carregar.
 * O modelo real mora no JSON (origem: planta-real); aqui fica um único
 * cômodo do tamanho do envelope para o app não abrir vazio.
 */
export function criarCasaPadrao() {
  const env = { ...ENVELOPE_PADRAO };
  const margem = env.espExterna / 2;
  return {
    versao: 1,
    origem: 'sem-origem',
    fonte: 'Nenhuma planta carregada. Use Dados → Carregar do projeto.',
    envelope: env,
    rooms: [
      {
        id: 'casa',
        nome: 'Casa (sem planta)',
        tipo: 'outro',
        x: env.x0 + margem,
        z: env.z0 + margem,
        w: env.x1 - env.x0 - env.espExterna,
        d: env.z1 - env.z0 - env.espExterna,
        cor: '#94a3b8',
        piso: 'nao_definido',
        status: 'estimado',
        notas: '',
        portas: [],
        janelas: [],
        mobilia: false,
      },
    ],
    moveis: [],
    materiais: {},
    atualizadoEm: null,
  };
}
export function clonar(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Devolve os vértices [x, z] do polígono do cômodo (4 vértices ou 5 quando há chanfro).
 */
export function poligonoComodo(r) {
  const x0 = r.x;
  const x1 = r.x + r.w;
  const z0 = r.z;
  const z1 = r.z + r.d;
  const ch = r.chanfro;
  if (ch && ch.canto === 'frente-esquerda' && ch.dx > 0.05 && ch.dz > 0.05) {
    const dx = Math.min(ch.dx, r.w - 0.2);
    const dz = Math.min(ch.dz, r.d - 0.2);
    return [
      [x0, z0],
      [x1, z0],
      [x1, z1],
      [x0 + dx, z1],
      [x0, z1 - dz],
    ];
  }
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
}

export function areaComodo(r) {
  const base = Math.max(0, r.w) * Math.max(0, r.d);
  const ch = r.chanfro;
  if (ch && ch.dx > 0.05 && ch.dz > 0.05) {
    return Math.max(0, base - (ch.dx * ch.dz) / 2);
  }
  return base;
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
        paredesAbertas: Array.isArray(r.paredesAbertas)
          ? [...new Set(r.paredesAbertas.filter((p) => ['frente', 'fundo', 'esquerda', 'direita'].includes(p)))]
          : [],
        ...(r.chanfro && typeof r.chanfro === 'object' && r.chanfro.canto === 'frente-esquerda'
          ? {
              chanfro: {
                canto: 'frente-esquerda',
                dx: numeroValido(r.chanfro.dx ?? 0.5, 0.1, 4),
                dz: numeroValido(r.chanfro.dz ?? 1.0, 0.1, 4),
                ...(r.chanfro.porta
                  ? {
                      porta: {
                        largura: numeroValido(r.chanfro.porta.largura ?? 0.85, 0.4, 3),
                        altura: numeroValido(r.chanfro.porta.altura ?? 2.1, 0.5, 2.8),
                      },
                    }
                  : {}),
              },
            }
          : {}),
        mobilia: typeof r.mobilia === 'boolean' ? r.mobilia : true,
      };
    });

  if (rooms.length === 0) return padrao;
  const moveis = Array.isArray(bruta.moveis)
    ? bruta.moveis.filter((m) => m && typeof m === 'object').map((m) => normalizarMovel(m, rooms))
    : gerarMoveisIniciaisDaCasa(rooms);
  const materiais = {};
  if (bruta.materiais && typeof bruta.materiais === 'object') {
    for (const [k, v] of Object.entries(bruta.materiais)) {
      if (!v || typeof v !== 'object') continue;
      materiais[String(k).slice(0, 80)] = {
        ...(v.texturaId ? { texturaId: String(v.texturaId).slice(0, 60) } : {}),
        ...(v.fotoUrl ? { fotoUrl: String(v.fotoUrl) } : {}),
        ...(Number.isFinite(Number(v.rep)) ? { rep: Math.min(12, Math.max(0.5, Number(v.rep))) } : {}),
        ...(v.acabamento ? { acabamento: String(v.acabamento).slice(0, 20) } : {}),
        ...(v.rotulo ? { rotulo: String(v.rotulo).slice(0, 60) } : {}),
      };
    }
  }
  return {
    versao: 1,
    origem: typeof bruta.origem === 'string' && bruta.origem ? bruta.origem : 'sem-origem',
    fonte: typeof bruta.fonte === 'string' ? bruta.fonte.slice(0, 300) : '',
    envelope: env,
    rooms,
    moveis,
    materiais,
    atualizadoEm: bruta.atualizadoEm || null,
  };
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
        ...(a.vao ? { vao: true } : {}),
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

  const blocosDiagonais = [];

  for (const room of casa.rooms) {
    const abertas = new Set(room.paredesAbertas || []);
    const ch = room.chanfro;
    for (const parede of ['frente', 'fundo', 'esquerda', 'direita']) {
      const p = paredeDoComodo(room, parede);
      if (!p) continue;
      let ini = p.ini;
      let fim = p.fim;
      if (ch && ch.canto === 'frente-esquerda') {
        if (parede === 'esquerda') fim = Math.max(ini, fim - ch.dz);
        if (parede === 'frente') ini = Math.min(fim, ini + ch.dx);
      }
      const aberturas = [];
      if (abertas.has(parede)) {
        // Face totalmente aberta (ex.: frente do alpendre, saída do corredor externo, vão livre): sem parede nem verga.
        aberturas.push({ ini, fim, peitoril: 0, topo: env.altura + 0.2 });
      }
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
      if (fim - ini > EPS) {
        adicionar({ eixo: p.eixo, coord: p.coord, ini, fim, comodo: room.id, aberturas });
      }
    }

    // Parede diagonal do chanfro (ex.: 5ª aresta da Sala com a porta na diagonal!)
    if (ch && ch.canto === 'frente-esquerda' && ch.dx > 0.05 && ch.dz > 0.05) {
      const x1 = room.x;
      const z1 = room.z + room.d - ch.dz;
      const x2 = room.x + ch.dx;
      const z2 = room.z + room.d;
      const comp = Math.hypot(x2 - x1, z2 - z1);
      const esp = env.espExterna;
      const alt = env.altura;
      const pt = (t) => [x1 + (x2 - x1) * t, z1 + (z2 - z1) * t];

      if (ch.porta && comp > 0.2) {
        const larg = Math.min(ch.porta.largura, comp - 0.08);
        const t0 = Math.max(0, (comp - larg) / (2 * comp));
        const t1 = Math.min(1, 1 - t0);
        if (t0 > 0.01) {
          const [ax, az] = pt(0);
          const [bx, bz] = pt(t0);
          blocosDiagonais.push({ eixo: 'd', x1: ax, z1: az, x2: bx, z2: bz, yBase: 0, yTopo: alt, espessura: esp, externa: true, comodos: [room.id], tipo: 'parede' });
        }
        if (1 - t1 > 0.01) {
          const [ax, az] = pt(t1);
          const [bx, bz] = pt(1);
          blocosDiagonais.push({ eixo: 'd', x1: ax, z1: az, x2: bx, z2: bz, yBase: 0, yTopo: alt, espessura: esp, externa: true, comodos: [room.id], tipo: 'parede' });
        }
        if (ch.porta.altura < alt - 0.03) {
          const [ax, az] = pt(t0);
          const [bx, bz] = pt(t1);
          blocosDiagonais.push({ eixo: 'd', x1: ax, z1: az, x2: bx, z2: bz, yBase: ch.porta.altura, yTopo: alt, espessura: esp, externa: true, comodos: [room.id], tipo: 'verga' });
        }
      } else {
        blocosDiagonais.push({ eixo: 'd', x1, z1, x2, z2, yBase: 0, yTopo: alt, espessura: esp, externa: true, comodos: [room.id], tipo: 'parede' });
      }
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
  return [...blocos, ...blocosDiagonais];
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
          vao: Boolean(a.vao),
        });
      }
    }
    // Porta diagonal no chanfro (ex.: porta da Sala no final do alpendre)
    const ch = room.chanfro;
    if (ch && ch.canto === 'frente-esquerda' && ch.porta) {
      const x1 = room.x;
      const z1 = room.z + room.d - ch.dz;
      const x2 = room.x + ch.dx;
      const z2 = room.z + room.d;
      const comp = Math.hypot(x2 - x1, z2 - z1);
      const larg = Math.min(ch.porta.largura, comp - 0.08);
      const t0 = Math.max(0, (comp - larg) / (2 * comp));
      const t1 = Math.min(1, 1 - t0);
      saida.push({
        comodo: room.id,
        tipo: 'porta',
        parede: 'chanfro',
        eixo: 'd',
        x1: x1 + (x2 - x1) * t0,
        z1: z1 + (z2 - z1) * t0,
        x2: x1 + (x2 - x1) * t1,
        z2: z1 + (z2 - z1) * t1,
        largura: larg,
        altura: ch.porta.altura,
        peitoril: 0,
        externa: true,
        vao: false,
      });
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
  const semAberturas = ['circulacao', 'varanda', 'servico'].includes(room.tipo);
  const checks = [
    { id: 'medido', rotulo: 'Medidas conferidas na trena', peso: 25, ok: room.status === 'medido' },
    { id: 'portas', rotulo: 'Portas registradas', peso: 10, ok: room.portas.length > 0, aplicavel: !semAberturas },
    { id: 'janelas', rotulo: 'Janelas registradas', peso: 10, ok: room.janelas.length > 0, aplicavel: !semAberturas },
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
    portas += r.portas.length + (r.chanfro?.porta ? 1 : 0);
  }
  const rede = redeDeParedes(casa);
  for (const b of rede) {
    if (b.tipo === 'parede') {
      paredes += b.eixo === 'd' ? Math.hypot(b.x2 - b.x1, b.z2 - b.z1) : b.fim - b.ini;
    }
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

