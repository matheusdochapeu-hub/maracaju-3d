/**
 * config.js — Constantes do Maracaju 3D.
 *
 * Regra deste arquivo: só dados e textos. Nenhuma dependência, nenhum DOM.
 * Assim dá para conferir o conteúdo com testes automatizados (test/).
 */

export const VERSAO = '3.2.0';
export const CHAVE_ESTADO = 'maracaju3d_estado_v9';
export const CHAVE_ESTADO_ANTIGO = 'maracaju3d_state_v1';
export const CHAVE_DICAS = 'maracaju3d_dicas_v3';

export const SITE = {
  nome: 'Casa Maracaju 88',
  endereco: 'Rua Maracaju, 88 — Vila Tibério, Ribeirão Preto/SP',
  lat: -21.1741,
  lng: -47.834,
  azimuteLote: 39, // graus a partir do Norte, sentido Frente (Rua Maracaju, SO) → Fundo (Rua Cap. Pereira Lago, NE)
};

/** Cores dos cômodos: usadas na planta, na lista e nas etiquetas 3D. */
export const CORES_COMODO = ['#38bdf8', '#a78bfa', '#22d3ee', '#c084fc', '#fbbf24', '#94a3b8', '#34d399'];

/**
 * Módulos do ecossistema da casa. Posições em metros no referencial do lote
 * (x: esquerda→direita, z: fundo→frente, y: altura).
 */
export const MODULOS = {
  estacao_mesh: {
    nome: 'Estação Meteorológica + Mesh',
    curto: 'Clima e rádio 915 MHz',
    icone: '📡',
    grupo: 'digital',
    cor: '#38bdf8',
    visivel: true,
    x: 0.75,
    y: 4.35,
    z: -2,
    rot: 0,
    desc: 'Mastro no telhado com sensores de clima (Projeto 01), antena LoRa 915 MHz (Projeto 02) e painel solar 30 W voltado ao Norte.',
    dica: 'Precisa de mais de 6 h de sol no painel e altura livre de obstáculos.',
    regra: { tipo: 'minSol', valor: 4.5, aviso: 'Painel solar com pouca luz. Eleve ou centralize o mastro na cumeeira.' },
  },
  horta_15m: {
    nome: 'Plantas e irrigação (muro esquerdo)',
    curto: 'Corredor externo · até a linha da cozinha',
    icone: '🌿',
    grupo: 'producao',
    cor: '#22c55e',
    visivel: true,
    x: -1.65,
    y: 0,
    z: 0.8,
    rot: 0,
    desc: 'Floreiras e gotejamento no muro esquerdo do corredor externo (da porta do alpendre até onde começa a linha da cozinha).',
    dica: 'A área de plantas vai apenas até o início da cozinha (z = -0,65), deixando a lavanderia livre.',
    regra: null,
  },
  pergolado_frente: {
    nome: 'Pergolado de uva + cabaça',
    curto: 'Canteiro 2 × 3 m (frente escritório)',
    icone: '🍇',
    grupo: 'producao',
    cor: '#a855f7',
    visivel: true,
    x: 1.75,
    y: 0,
    z: 10.6,
    rot: 0,
    desc: 'Canteiro 2 × 3 m ao lado direito da garagem, defronte à janela do escritório (com acerolas, lavandas e babosas).',
    dica: 'Mantenha uma faixa de sol pleno e solo seco para as lavandas e babosas.',
    regra: null,
  },
  churrasco: {
    nome: 'Churrasco e convivência',
    curto: 'Fundo · muro dir. (Machado)',
    icone: '🔥',
    grupo: 'infra',
    cor: '#f59e0b',
    visivel: true,
    x: 2.35,
    y: 0,
    z: -13.6,
    rot: -90,
    desc: 'Churrasqueira e bancada apoiadas no muro direito (divisa vizinha Machado de Assis), sob a futura cobertura dos fundos.',
    dica: 'Ative a Cobertura dos fundos no painel Terreno para testar a sombra com a queda sentido Visconde de Taunay.',
    regra: null,
  },
  oficina: {
    nome: 'Oficina e bancada',
    curto: 'Bancada 1,60 × 0,65 m (muro dir.)',
    icone: '🛠️',
    grupo: 'infra',
    cor: '#f97316',
    visivel: true,
    x: 2.85,
    y: 0,
    z: -15.6,
    rot: -90,
    desc: 'Bancada com morsa, painel perfurado e tomada 20 A encostada no muro direito sob a futura cobertura. Base para fabricar a horta, o tanque e o galinheiro.',
    dica: 'Primeira coisa a montar depois da cobertura: tudo o resto depende dela.',
    regra: null,
  },
  emergencia_72h: {
    nome: 'Estação de emergência 72 h',
    curto: 'Água, bateria e rádio (muro dir.)',
    icone: '🚨',
    grupo: 'infra',
    cor: '#ef4444',
    visivel: true,
    x: 2.9,
    y: 0,
    z: -17.3,
    rot: -90,
    desc: 'Armário protegido sob a futura cobertura (muro direito) com galões de água, banco LiFePO4 12 V, mantimentos e rádio/Mesh.',
    dica: 'Precisa ficar 100% na sombra e longe do calor da churrasqueira.',
    regra: { tipo: 'maxSol', valor: 1.0, aviso: 'Este armário não pode pegar sol direto. Ative a cobertura dos fundos ou mova para a sombra.' },
  },
  tanque_peixes: {
    nome: 'Tanque de peixes / aquaponia',
    curto: '500–1000 L com biofiltro',
    icone: '🐟',
    grupo: 'producao',
    cor: '#06b6d4',
    visivel: true,
    x: 0.45,
    y: 0,
    z: -15.6,
    rot: 0,
    desc: 'Tanque sombreado para tilápia ou lambari com biofiltro compacto. A água trocada aduba a horta e o lodo vai para a composteira.',
    dica: 'Crítico em Ribeirão Preto: sem sombra a água passa de 31 °C e os peixes perdem oxigênio.',
    regra: { tipo: 'maxSolTarde', valor: 1.5, aviso: 'Sol da tarde no tanque aquece a água acima de 32 °C. Ative a cobertura ou use sombrite 70%.' },
  },
  galinheiro: {
    nome: 'Galinheiro elevado',
    curto: '4 poedeiras · fundo esq.',
    icone: '🐔',
    grupo: 'producao',
    cor: '#eab308',
    visivel: true,
    x: -0.65,
    y: 0,
    z: -17.3,
    rot: 0,
    desc: 'Dormitório elevado com gaveta de esterco e piquete de areia drenante. Sol da manhã higieniza e a cobertura própria protege à tarde.',
    dica: 'Ideal: 2 a 4 h de sol da manhã e sombra obrigatória depois das 13 h.',
    regra: null,
  },
  tenebrios: {
    nome: 'Torre de tenébrios',
    curto: 'Proteína viva na sombra',
    icone: '🪲',
    grupo: 'producao',
    cor: '#d97706',
    visivel: true,
    x: 1.7,
    y: 0,
    z: -14.8,
    rot: 0,
    desc: 'Cinco caixas (45 × 35 × 120 cm) produzindo cerca de 50 g por dia de larvas e adubo (frass) para a horta.',
    dica: 'Obrigatoriamente na sombra fresca, abaixo de 30 °C: monte só depois da cobertura.',
    regra: { tipo: 'maxSol', valor: 1.0, aviso: 'Sol direto mata a colônia de tenébrios. Ative a cobertura dos fundos ou mova para sombra total.' },
  },
  algas_azolla: {
    nome: 'Algas e azolla',
    curto: 'Spirulina + azolla',
    icone: '🫧',
    grupo: 'producao',
    cor: '#10b981',
    visivel: true,
    x: -1.1,
    y: 0,
    z: -13.6,
    rot: 0,
    desc: 'Bancada de 1,20 × 0,60 m com fotorreator de spirulina e tanque telado de azolla para alimentar galinhas e peixes.',
    dica: 'Ideal: 3 a 5 h de sol filtrado (meia-sombra ou sombrite 50%).',
    regra: null,
  },
  composteira: {
    nome: 'Composteira (3 baias)',
    curto: 'Ciclo orgânico fechado',
    icone: '♻️',
    grupo: 'producao',
    cor: '#84cc16',
    visivel: true,
    x: -1.6,
    y: 0,
    z: -15.4,
    rot: 90,
    desc: 'Recicla restos da cozinha, podas da horta, esterco das galinhas e lodo do filtro dos peixes, gerando húmus para a horta.',
    dica: 'Na sombra, sempre: as minhocas não sobrevivem ao calor do sol pleno.',
    regra: { tipo: 'maxSol', valor: 1.0, aviso: 'Composteira no sol esquenta e mata as minhocas. Mova para a sombra.' },
  },
};

export const GRUPOS_MODULOS = {
  digital: { titulo: 'Cérebro digital', icone: '📡' },
  infra: { titulo: 'Fundos cobertos', icone: '🏗️' },
  producao: { titulo: 'Produção e reciclagem', icone: '🌱' },
};

/**
 * Roteiro de captura. Isso é o que faz a casa sair do "incompleto":
 * cada área tem um alvo de fotos, dicas objetivas e um vídeo opcional.
 */
export const ROTEIRO_CAPTURA = {
  sala: {
    titulo: 'Sala',
    alvo: 8,
    dicas: [
      'Fique em um canto e gire o corpo devagar, sem zoom.',
      'Fotografe as 4 paredes, o chão e o teto.',
      'Inclua portas e janelas inteiras no quadro.',
    ],
  },
  quarto1: {
    titulo: 'Escritório (Quarto frente)',
    alvo: 8,
    dicas: ['Um canto → 4 paredes.', 'Fotografe a janela que dá para o canteiro 2×3 m.', 'Registre tomadas e interruptores.'],
  },
  banheiro: {
    titulo: 'Banheiro social rosa',
    alvo: 8,
    dicas: ['Luz acesa se estiver escuro.', 'Fotografe a porta do corredor interno e a janela do corredor externo.', 'Mostre ralo e registros.'],
  },
  quarto2: {
    titulo: 'Quarto do fundo (Suíte)',
    alvo: 8,
    dicas: ['Fotografe a parede do guarda-roupa embutido e a porta do banheiro da suíte.', 'Mostre a janela para o corredor externo.'],
  },
  cozinha: {
    titulo: 'Cozinha',
    alvo: 9,
    dicas: ['Fotografe a bancada, porta/janela do corredor externo e a abertura para o corredor interno.', 'Registre onde ficam água e gás.'],
  },
  corredor: {
    titulo: 'Corredor externo (Muro plantas)',
    alvo: 5,
    dicas: ['Fotografe da porta do alpendre até os fundos.', 'Mostre o muro esquerdo de divisa e as janelas da casa.'],
  },
  banheiro2: {
    titulo: 'Banheiro da suíte',
    alvo: 8,
    dicas: ['Luz acesa.', 'Fotografe o box, a pia, a janela do corredor externo e a porta para o quarto do fundo.'],
  },
  alpendre: {
    titulo: 'Alpendre coberto',
    alvo: 6,
    dicas: ['Fotografe da garagem para dentro e de dentro para a frente.', 'Inclua a parede do escritório e o telhado.'],
  },
  alpendre_acesso: {
    titulo: 'Duas portas (final alpendre)',
    alvo: 3,
    dicas: ['Mostre as duas portas lado a lado: esquerda (corredor externo) e direita (sala).'],
  },
  corredor_interno: {
    titulo: 'Corredor interno',
    alvo: 3,
    dicas: ['Mostre a abertura da cozinha, a porta do banheiro social rosa e a porta do quarto do fundo.'],
  },
  muro: {
    titulo: 'Muro de 15 m',
    alvo: 12,
    dicas: [
      'Caminhe de frente para o muro, 1 passo por foto.',
      'Deixe 70% de sobreposição entre fotos vizinhas.',
      'Faça uma passada reta e outra a 30° pegando muro + chão.',
    ],
  },
  fundos: {
    titulo: 'Fundos / obra',
    alvo: 12,
    dicas: [
      'Gire 360° no centro do quintal.',
      'Fotografe os 4 cantos olhando para o centro.',
      'Inclua o beiral do telhado e a altura dos muros.',
    ],
  },
  frente: {
    titulo: 'Frente da casa',
    alvo: 8,
    dicas: ['Fotografe a fachada de dois ângulos.', 'Registre o portão, o canteiro 3 × 2 m e a calçada.'],
  },
};

export const DICAS_SOL = [
  'No verão o sol fica mais alto: sombra curta e calor forte no telhado.',
  'No inverno o sol fica mais baixo e entra mais fundo pelas janelas.',
  'Paredes voltadas para o Oeste esquentam no fim da tarde e irradiam calor à noite.',
];
