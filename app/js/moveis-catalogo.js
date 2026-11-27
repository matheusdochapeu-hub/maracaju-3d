/**
 * moveis-catalogo.js — Catálogo de móveis e eletrodomésticos + helpers puros.
 *
 * Sem Three.js e sem DOM: pode ser testado direto em Node (test/moveis.test.mjs).
 * As coordenadas (x, z) de cada móvel inserido são relativas ao canto (room.x, room.z)
 * do cômodo em que ele está (em metros), assim mover um cômodo move seus móveis junto.
 */

export const CATEGORIAS_MOVEIS = {
  todos: { nome: 'Todos', icone: '📦' },
  sala: { nome: 'Sala', icone: '🛋️' },
  quarto: { nome: 'Quarto / Escritório', icone: '🛏️' },
  cozinha: { nome: 'Cozinha', icone: '🍳' },
  banheiro: { nome: 'Banheiro / Lav.', icone: '🚿' },
  eletro: { nome: 'Eletros', icone: '⚡' },
  personalizado: { nome: 'Meus criados', icone: '✨' },
};

export const FORMAS_MOVEL = {
  sofa: 'Sofá',
  sofa_l: 'Sofá em L',
  poltrona: 'Poltrona',
  mesa: 'Mesa / Escrivaninha',
  cadeira: 'Cadeira',
  cama: 'Cama',
  rack: 'Rack / Aparador',
  tv: 'TV / Tela',
  armario: 'Armário / Estante',
  bancada: 'Bancada / Pia',
  geladeira: 'Geladeira / Freezer',
  fogao: 'Fogão / Cooktop',
  lavadora: 'Máquina de lavar',
  ar_split: 'Ar-condicionado Split',
  box: 'Box de vidro',
  vaso: 'Vaso sanitário',
  pia: 'Gabinete / Pia',
  tapete: 'Tapete',
  bloco: 'Bloco simples',
};

/** Catálogo padrão de móveis e eletrodomésticos com medidas reais (em metros). */
export const CATALOGO_MOVEIS = [
  // ---- SALA ----
  { id: 'sofa_3l', nome: 'Sofá 3 lugares', categoria: 'sala', forma: 'sofa', w: 2.1, d: 0.9, h: 0.85, y: 0, cor: '#475569' },
  { id: 'sofa_2l', nome: 'Sofá 2 lugares', categoria: 'sala', forma: 'sofa', w: 1.6, d: 0.88, h: 0.85, y: 0, cor: '#526071' },
  { id: 'sofa_l', nome: 'Sofá em L / Retrátil', categoria: 'sala', forma: 'sofa_l', w: 2.3, d: 1.5, h: 0.88, y: 0, cor: '#3f4e60' },
  { id: 'poltrona', nome: 'Poltrona', categoria: 'sala', forma: 'poltrona', w: 0.82, d: 0.82, h: 0.85, y: 0, cor: '#64748b' },
  { id: 'mesa_centro', nome: 'Mesa de centro', categoria: 'sala', forma: 'mesa', w: 0.9, d: 0.55, h: 0.38, y: 0, cor: '#8a5a3b' },
  { id: 'rack_tv', nome: 'Rack de TV', categoria: 'sala', forma: 'rack', w: 1.5, d: 0.4, h: 0.52, y: 0, cor: '#7c4d30' },
  { id: 'estante', nome: 'Estante / Livreiro', categoria: 'sala', forma: 'armario', w: 1.0, d: 0.36, h: 1.85, y: 0, cor: '#8b5e3c' },
  { id: 'aparador', nome: 'Aparador / Buffet', categoria: 'sala', forma: 'rack', w: 1.4, d: 0.42, h: 0.8, y: 0, cor: '#926243' },
  { id: 'mesa_jantar_4', nome: 'Mesa jantar 4 lugares', categoria: 'sala', forma: 'mesa', w: 1.2, d: 0.8, h: 0.76, y: 0, cor: '#9a6b49' },
  { id: 'mesa_jantar_6', nome: 'Mesa jantar 6 lugares', categoria: 'sala', forma: 'mesa', w: 1.6, d: 0.9, h: 0.76, y: 0, cor: '#8a5a3b' },
  { id: 'tapete_sala', nome: 'Tapete sala', categoria: 'sala', forma: 'tapete', w: 2.0, d: 1.5, h: 0.02, y: 0, cor: '#6b7280' },

  // ---- QUARTO & ESCRITÓRIO ----
  { id: 'cama_casal', nome: 'Cama casal', categoria: 'quarto', forma: 'cama', w: 1.48, d: 1.98, h: 0.55, y: 0, cor: '#5b6b7c' },
  { id: 'cama_queen', nome: 'Cama queen', categoria: 'quarto', forma: 'cama', w: 1.68, d: 2.08, h: 0.58, y: 0, cor: '#4b5a6b' },
  { id: 'cama_solteiro', nome: 'Cama solteiro', categoria: 'quarto', forma: 'cama', w: 0.98, d: 1.98, h: 0.55, y: 0, cor: '#5b6b7c' },
  { id: 'criado_mudo', nome: 'Criado-mudo', categoria: 'quarto', forma: 'rack', w: 0.45, d: 0.4, h: 0.5, y: 0, cor: '#8a5a3b' },
  { id: 'comoda', nome: 'Cômoda', categoria: 'quarto', forma: 'armario', w: 1.0, d: 0.46, h: 0.95, y: 0, cor: '#8a5a3b' },
  { id: 'guarda_roupa', nome: 'Guarda-roupa solto', categoria: 'quarto', forma: 'armario', w: 1.6, d: 0.55, h: 2.15, y: 0, cor: '#7c4d30' },
  { id: 'escrivaninha', nome: 'Escrivaninha / Mesa PC', categoria: 'quarto', forma: 'mesa', w: 1.5, d: 0.65, h: 0.75, y: 0, cor: '#8a5a3b' },
  { id: 'mesa_l', nome: 'Mesa escritório em L', categoria: 'quarto', forma: 'sofa_l', w: 1.5, d: 1.2, h: 0.75, y: 0, cor: '#7c4d30' },
  { id: 'cadeira_escritorio', nome: 'Cadeira escritório / gamer', categoria: 'quarto', forma: 'cadeira', w: 0.58, d: 0.58, h: 1.05, y: 0, cor: '#334155' },
  { id: 'penteadeira', nome: 'Penteadeira', categoria: 'quarto', forma: 'mesa', w: 1.0, d: 0.45, h: 0.8, y: 0, cor: '#d6cfc7' },
  { id: 'prateleira', nome: 'Prateleira de parede', categoria: 'quarto', forma: 'bloco', w: 1.2, d: 0.25, h: 0.05, y: 1.5, cor: '#9a6b49' },

  // ---- COZINHA ----
  { id: 'bancada_pia', nome: 'Bancada / Pia cozinha', categoria: 'cozinha', forma: 'bancada', w: 2.2, d: 0.6, h: 0.9, y: 0, cor: '#c9cdd2' },
  { id: 'balcao_ilha', nome: 'Balcão / Ilha', categoria: 'cozinha', forma: 'bancada', w: 1.4, d: 0.6, h: 0.95, y: 0, cor: '#94a3b8' },
  { id: 'armario_aereo', nome: 'Armário aéreo cozinha', categoria: 'cozinha', forma: 'armario', w: 1.4, d: 0.35, h: 0.7, y: 1.55, cor: '#e2e8f0' },
  { id: 'mesa_cozinha', nome: 'Mesa cozinha 4 lugares', categoria: 'cozinha', forma: 'mesa', w: 1.1, d: 0.75, h: 0.76, y: 0, cor: '#cbd5e1' },
  { id: 'fruteira', nome: 'Fruteira / Carrinho', categoria: 'cozinha', forma: 'rack', w: 0.5, d: 0.4, h: 0.85, y: 0, cor: '#a3a3a3' },

  // ---- BANHEIRO & LAVANDERIA ----
  { id: 'box_vidro', nome: 'Box de vidro + base', categoria: 'banheiro', forma: 'box', w: 0.9, d: 0.9, h: 1.95, y: 0, cor: '#9fd8f2' },
  { id: 'vaso_sanitario', nome: 'Vaso sanitário', categoria: 'banheiro', forma: 'vaso', w: 0.4, d: 0.62, h: 0.75, y: 0, cor: '#f2f5f8' },
  { id: 'gabinete_pia', nome: 'Gabinete + Pia banheiro', categoria: 'banheiro', forma: 'pia', w: 0.7, d: 0.45, h: 0.82, y: 0, cor: '#c9cdd2' },
  { id: 'tanque', nome: 'Tanque de lavar', categoria: 'banheiro', forma: 'pia', w: 0.6, d: 0.55, h: 0.85, y: 0, cor: '#e2e8f0' },
  { id: 'armario_lav', nome: 'Armário lavanderia', categoria: 'banheiro', forma: 'armario', w: 0.8, d: 0.45, h: 1.8, y: 0, cor: '#cbd5e1' },

  // ---- ELETRODOMÉSTICOS ----
  { id: 'tv_55', nome: 'TV 55"', categoria: 'eletro', forma: 'tv', w: 1.23, d: 0.08, h: 0.72, y: 0.95, cor: '#1e293b' },
  { id: 'tv_43', nome: 'TV 43"', categoria: 'eletro', forma: 'tv', w: 0.97, d: 0.08, h: 0.58, y: 0.95, cor: '#1e293b' },
  { id: 'geladeira', nome: 'Geladeira Frost Free', categoria: 'eletro', forma: 'geladeira', w: 0.7, d: 0.72, h: 1.82, y: 0, cor: '#dfe5ea' },
  { id: 'fogao_4b', nome: 'Fogão 4 bocas', categoria: 'eletro', forma: 'fogao', w: 0.56, d: 0.62, h: 0.9, y: 0, cor: '#e2e8f0' },
  { id: 'cooktop_forno', nome: 'Cooktop / Forno embutido', categoria: 'eletro', forma: 'fogao', w: 0.65, d: 0.6, h: 0.88, y: 0, cor: '#334155' },
  { id: 'microondas', nome: 'Micro-ondas', categoria: 'eletro', forma: 'bloco', w: 0.52, d: 0.38, h: 0.3, y: 0.92, cor: '#cbd5e1' },
  { id: 'maquina_lavar', nome: 'Máquina de lavar roupas', categoria: 'eletro', forma: 'lavadora', w: 0.62, d: 0.65, h: 0.95, y: 0, cor: '#f1f5f9' },
  { id: 'lava_loucas', nome: 'Lava-louças', categoria: 'eletro', forma: 'lavadora', w: 0.6, d: 0.6, h: 0.85, y: 0, cor: '#e2e8f0' },
  { id: 'freezer', nome: 'Freezer horizontal', categoria: 'eletro', forma: 'geladeira', w: 1.1, d: 0.65, h: 0.9, y: 0, cor: '#f8fafc' },
  { id: 'ar_split', nome: 'Ar-condicionado Split', categoria: 'eletro', forma: 'ar_split', w: 0.85, d: 0.22, h: 0.3, y: 2.25, cor: '#f8fafc' },
  { id: 'bebedouro', nome: 'Bebedouro / Purificador', categoria: 'eletro', forma: 'geladeira', w: 0.35, d: 0.38, h: 0.98, y: 0, cor: '#e2e8f0' },
];

function num(v, min, max, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function normalizarTexto(txt) {
  return String(txt || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Mescla o catálogo padrão com edições e móveis criados pelo usuário. */
export function montarCatalogo(edicoes = {}, personalizados = []) {
  const base = CATALOGO_MOVEIS.map((item) => {
    const ed = edicoes && edicoes[item.id];
    return ed ? normalizarItemCatalogo({ ...item, ...ed, id: item.id, padrao: true }) : { ...item, padrao: true };
  });
  const extras = (Array.isArray(personalizados) ? personalizados : [])
    .filter((it) => it && typeof it === 'object' && it.id)
    .map((it) => normalizarItemCatalogo({ ...it, padrao: false }));
  return [...extras, ...base];
}

export function normalizarItemCatalogo(bruto) {
  const forma = FORMAS_MOVEL[bruto?.forma] ? bruto.forma : 'bloco';
  const categoria = CATEGORIAS_MOVEIS[bruto?.categoria] && bruto.categoria !== 'todos' ? bruto.categoria : 'personalizado';
  return {
    id: String(bruto?.id || `item-${Date.now().toString(36)}`).slice(0, 60),
    nome: String(bruto?.nome || 'Móvel personalizado').trim().slice(0, 60) || 'Móvel personalizado',
    categoria,
    forma,
    w: +num(bruto?.w, 0.15, 6, 1.0).toFixed(2),
    d: +num(bruto?.d, 0.05, 6, 0.6).toFixed(2),
    h: +num(bruto?.h, 0.02, 3, 0.8).toFixed(2),
    y: +num(bruto?.y, 0, 2.6, 0).toFixed(2),
    cor: /^#[0-9a-f]{6}$/i.test(bruto?.cor || '') ? bruto.cor : '#8a5a3b',
    padrao: Boolean(bruto?.padrao),
  };
}

/** Filtra catálogo por texto (sem acento) e categoria. */
export function buscarCatalogo(catalogo, termo = '', categoria = 'todos') {
  const q = normalizarTexto(termo);
  return catalogo.filter((item) => {
    if (categoria && categoria !== 'todos') {
      if (categoria === 'personalizado' && item.padrao) return false;
      if (categoria !== 'personalizado' && item.categoria !== categoria) return false;
    }
    if (!q) return true;
    const alvo = normalizarTexto(`${item.nome} ${item.categoria} ${FORMAS_MOVEL[item.forma] || ''}`);
    return alvo.includes(q);
  });
}

/** Normaliza um móvel posicionado dentro de `casa.moveis`. */
export function normalizarMovel(bruto, rooms = []) {
  const room = rooms.find((r) => r.id === bruto?.comodoId) || rooms[0];
  const comodoId = room ? room.id : String(bruto?.comodoId || 'sala');
  const forma = FORMAS_MOVEL[bruto?.forma] ? bruto.forma : 'bloco';
  const w = +num(bruto?.w, 0.12, 6, 1.0).toFixed(2);
  const d = +num(bruto?.d, 0.04, 6, 0.6).toFixed(2);
  const h = +num(bruto?.h, 0.02, 3, 0.8).toFixed(2);
  const y = +num(bruto?.y, 0, 2.6, 0).toFixed(2);
  const maxX = room ? room.w : 10;
  const maxZ = room ? room.d : 10;
  const x = +num(bruto?.x, 0, maxX, maxX / 2).toFixed(2);
  const z = +num(bruto?.z, 0, maxZ, maxZ / 2).toFixed(2);
  const rot = ((Math.round(num(bruto?.rot, -360, 720, 0)) % 360) + 360) % 360;
  return {
    id: String(bruto?.id || `mov-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`).slice(0, 60),
    catalogoId: bruto?.catalogoId ? String(bruto.catalogoId).slice(0, 60) : null,
    nome: String(bruto?.nome || 'Móvel').trim().slice(0, 60) || 'Móvel',
    categoria: CATEGORIAS_MOVEIS[bruto?.categoria] && bruto.categoria !== 'todos' ? bruto.categoria : 'sala',
    forma,
    comodoId,
    x,
    z,
    y,
    w,
    d,
    h,
    rot,
    cor: /^#[0-9a-f]{6}$/i.test(bruto?.cor || '') ? bruto.cor : '#8a5a3b',
  };
}

/** Cria uma nova instância de móvel a partir de um item do catálogo dentro do cômodo escolhido. */
export function criarMovelNoComodo(item, room, existentes = []) {
  const noComodo = existentes.filter((m) => m.comodoId === room.id).length;
  const desloc = ((noComodo % 5) - 2) * 0.2;
  const x = Math.min(Math.max(0.25, room.w / 2 + desloc), Math.max(0.25, room.w - 0.25));
  const z = Math.min(Math.max(0.25, room.d / 2 + desloc), Math.max(0.25, room.d - 0.25));
  return normalizarMovel(
    {
      id: `mov-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      catalogoId: item.id,
      nome: item.nome,
      categoria: item.categoria,
      forma: item.forma,
      comodoId: room.id,
      x,
      z,
      y: item.y ?? 0,
      w: item.w,
      d: item.d,
      h: item.h,
      rot: 0,
      cor: item.cor,
    },
    [room]
  );
}

/**
 * Converte a mobília de referência original da casa em móveis reais editáveis (`casa.moveis`).
 * Assim o usuário pode mover, redimensionar, girar ou apagar os móveis que já estavam no projeto!
 */
export function gerarMoveisIniciaisDaCasa(rooms = []) {
  const lista = [];
  let seq = 1;
  const push = (room, cfg) => {
    lista.push(
      normalizarMovel(
        {
          id: `mov-init-${room.id}-${seq++}`,
          comodoId: room.id,
          ...cfg,
        },
        rooms
      )
    );
  };

  for (const r of rooms) {
    if (r.mobilia === false) continue;
    if (r.tipo === 'sala') {
      push(r, { catalogoId: 'sofa_3l', nome: 'Sofá 3 lugares', categoria: 'sala', forma: 'sofa', w: 2.0, d: 0.85, h: 0.82, y: 0, x: 0.55, z: r.d * 0.45, rot: 90, cor: '#5b6b7c' });
      push(r, { catalogoId: 'mesa_centro', nome: 'Mesa de centro', categoria: 'sala', forma: 'mesa', w: 0.6, d: 0.6, h: 0.36, y: 0, x: 1.75, z: r.d * 0.45, rot: 0, cor: '#8a5a3b' });
      push(r, { catalogoId: 'rack_tv', nome: 'Rack de TV', categoria: 'sala', forma: 'rack', w: 1.2, d: 0.38, h: 0.5, y: 0, x: r.w - 0.25, z: r.d * 0.72, rot: 90, cor: '#8a5a3b' });
      push(r, { catalogoId: 'tv_43', nome: 'TV 43"', categoria: 'eletro', forma: 'tv', w: 1.0, d: 0.08, h: 0.62, y: 0.85, x: r.w - 0.08, z: r.d * 0.72, rot: 90, cor: '#1e293b' });
    } else if (r.tipo === 'quarto' && r.id === 'quarto1') {
      push(r, { catalogoId: 'escrivaninha', nome: 'Escrivaninha / Mesa PC', categoria: 'quarto', forma: 'mesa', w: 1.5, d: 0.65, h: 0.75, y: 0, x: r.w * 0.5, z: r.d - 0.55, rot: 0, cor: '#8a5a3b' });
      push(r, { catalogoId: 'cadeira_escritorio', nome: 'Cadeira escritório', categoria: 'quarto', forma: 'cadeira', w: 0.56, d: 0.56, h: 0.98, y: 0, x: r.w * 0.5, z: r.d - 1.25, rot: 0, cor: '#475569' });
    } else if (r.tipo === 'quarto' && r.id === 'quarto2') {
      push(r, { catalogoId: 'cama_casal', nome: 'Cama casal', categoria: 'quarto', forma: 'cama', w: 1.48, d: 1.98, h: 0.55, y: 0, x: r.w - 1.05, z: 1.15, rot: 0, cor: '#5b6b7c' });
    } else if (r.tipo === 'quarto') {
      push(r, { catalogoId: 'cama_casal', nome: 'Cama casal', categoria: 'quarto', forma: 'cama', w: 1.48, d: 1.98, h: 0.55, y: 0, x: 0.95, z: 1.15, rot: 0, cor: '#5b6b7c' });
      push(r, { catalogoId: 'criado_mudo', nome: 'Criado-mudo', categoria: 'quarto', forma: 'rack', w: 0.45, d: 0.4, h: 0.48, y: 0, x: 1.95, z: 0.35, rot: 0, cor: '#8a5a3b' });
    } else if (r.tipo === 'cozinha') {
      push(r, { catalogoId: 'bancada_pia', nome: 'Bancada / Pia cozinha', categoria: 'cozinha', forma: 'bancada', w: Math.min(2.3, r.w - 0.5), d: 0.6, h: 0.9, y: 0, x: Math.min(2.3, r.w - 0.5) / 2 + 0.12, z: 0.35, rot: 0, cor: '#c9cdd2' });
      push(r, { catalogoId: 'fogao_4b', nome: 'Fogão 4 bocas', categoria: 'eletro', forma: 'fogao', w: 0.58, d: 0.62, h: 0.9, y: 0, x: r.w - 0.45, z: 0.42, rot: 0, cor: '#e2e8f0' });
      push(r, { catalogoId: 'geladeira', nome: 'Geladeira Frost Free', categoria: 'eletro', forma: 'geladeira', w: 0.68, d: 0.72, h: 1.82, y: 0, x: r.w - 0.45, z: 1.35, rot: 0, cor: '#dfe5ea' });
    } else if (r.tipo === 'banheiro' && r.id === 'banheiro2') {
      push(r, { catalogoId: 'box_vidro', nome: 'Box de vidro', categoria: 'banheiro', forma: 'box', w: 0.9, d: 0.9, h: 1.95, y: 0, x: r.w - 0.52, z: r.d - 0.5, rot: 0, cor: '#9fd8f2' });
      push(r, { catalogoId: 'vaso_sanitario', nome: 'Vaso sanitário', categoria: 'banheiro', forma: 'vaso', w: 0.4, d: 0.58, h: 0.75, y: 0, x: 1.15, z: r.d - 0.35, rot: 0, cor: '#f2f5f8' });
      push(r, { catalogoId: 'gabinete_pia', nome: 'Gabinete + Pia', categoria: 'banheiro', forma: 'pia', w: 0.65, d: 0.42, h: 0.82, y: 0, x: 1.4, z: 0.3, rot: 0, cor: '#c9cdd2' });
    } else if (r.tipo === 'banheiro') {
      push(r, { catalogoId: 'box_vidro', nome: 'Box de vidro', categoria: 'banheiro', forma: 'box', w: 0.9, d: 0.9, h: 1.95, y: 0, x: 0.5, z: 0.5, rot: 0, cor: '#9fd8f2' });
      push(r, { catalogoId: 'vaso_sanitario', nome: 'Vaso sanitário', categoria: 'banheiro', forma: 'vaso', w: 0.4, d: 0.6, h: 0.75, y: 0, x: 0.4, z: r.d - 0.42, rot: 0, cor: '#f2f5f8' });
      push(r, { catalogoId: 'gabinete_pia', nome: 'Gabinete + Pia', categoria: 'banheiro', forma: 'pia', w: 0.68, d: 0.44, h: 0.82, y: 0, x: r.w - 0.45, z: 0.32, rot: 0, cor: '#c9cdd2' });
    }
  }
  return lista;
}
