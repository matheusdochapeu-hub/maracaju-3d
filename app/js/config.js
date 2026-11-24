/**
 * config.js — Constantes do Maracaju 3D.
 *
 * Regra deste arquivo: só dados e textos. Nenhuma dependência, nenhum DOM.
 * Assim dá para conferir o conteúdo com testes automatizados (test/).
 */

export const VERSAO = '3.0.0';
export const CHAVE_ESTADO = 'maracaju3d_estado_v3';
export const CHAVE_ESTADO_ANTIGO = 'maracaju3d_state_v1';
export const CHAVE_DICAS = 'maracaju3d_dicas_v3';

export const SITE = {
  nome: 'Casa Maracaju 88',
  endereco: 'Rua Maracaju, 88 — Vila Tibério, Ribeirão Preto/SP',
  lat: -21.1742,
  lng: -47.8339,
  azimuteLote: 40, // graus a partir do Norte, sentido Frente (SO) → Fundo (NE)
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
    x: 1.0,
    y: 4.35,
    z: -3.8,
    rot: 0,
    desc: 'Mastro no telhado com sensores de clima (Projeto 01), antena LoRa 915 MHz (Projeto 02) e painel solar 30 W voltado ao Norte.',
    dica: 'Precisa de mais de 6 h de sol no painel e altura livre de obstáculos.',
    regra: { tipo: 'minSol', valor: 4.5, aviso: 'Painel solar com pouca luz. Eleve ou centralize o mastro na cumeeira.' },
  },
  horta_15m: {
    nome: 'Horta e irrigação (muro de 15 m)',
    curto: 'Setores A / B / C',
    icone: '🌿',
    grupo: 'producao',
    cor: '#22c55e',
    visivel: true,
    x: -3.0,
    y: 0,
    z: 1.0,
    rot: 0,
    desc: 'Floreiras e três setores de gotejamento ao longo do muro esquerdo, com sol da manhã entre 8 h e 12 h.',
    dica: 'Setor A (frente/seco): alecrim e tomilho. Setor B (centro): manjericão e flores. Setor C (fundo/úmido): hortelã e melissa.',
    regra: null,
  },
  pergolado_frente: {
    nome: 'Pergolado de uva + cabaça',
    curto: 'Canteiro da frente 3 × 2 m',
    icone: '🍇',
    grupo: 'producao',
    cor: '#a855f7',
    visivel: true,
    x: -1.7,
    y: 0,
    z: 10.6,
    rot: 0,
    desc: 'Pergolado baixo para uva BRS Vitória e treliça de cabaça no muro da frente, mantendo sol pleno para lavanda e flor-do-deserto.',
    dica: 'Precisa de 5 h ou mais de sol direto para adoçar a uva e frutificar a cabaça.',
    regra: null,
  },
  churrasco: {
    nome: 'Churrasco e convivência',
    curto: 'Zona social dos fundos',
    icone: '🔥',
    grupo: 'infra',
    cor: '#f59e0b',
    visivel: true,
    x: 1.7,
    y: 0,
    z: -8.3,
    rot: 0,
    desc: 'Churrasqueira, pia e bancada de apoio sob a telha sanduíche, no lado mais ventilado e perto do acesso da casa.',
    dica: 'Deixe o lado da casa aberto: integra a cozinha com a área coberta.',
    regra: null,
  },
  oficina: {
    nome: 'Oficina e bancada',
    curto: 'Bancada 1,60 × 0,65 m',
    icone: '🛠️',
    grupo: 'infra',
    cor: '#f97316',
    visivel: true,
    x: -0.9,
    y: 0,
    z: -8.4,
    rot: 0,
    desc: 'Bancada com morsa, painel perfurado e tomada 20 A sob a área coberta. É a base para fabricar a horta, o tanque e o galinheiro.',
    dica: 'Primeira coisa a montar depois da cobertura: tudo o resto depende dela.',
    regra: null,
  },
  emergencia_72h: {
    nome: 'Estação de emergência 72 h',
    curto: 'Água, bateria e rádio',
    icone: '🚨',
    grupo: 'infra',
    cor: '#ef4444',
    visivel: true,
    x: -2.4,
    y: 0,
    z: -7.6,
    rot: 0,
    desc: 'Armário protegido com galões de água, banco LiFePO4 12 V (backup do rádio e da bomba dos peixes), mantimentos e primeiros socorros.',
    dica: 'Precisa ficar 100% na sombra e longe do calor da churrasqueira.',
    regra: { tipo: 'maxSol', valor: 1.0, aviso: 'Este armário não pode pegar sol direto. Mova para baixo da cobertura.' },
  },
  tanque_peixes: {
    nome: 'Tanque de peixes / aquaponia',
    curto: '500–1000 L com biofiltro',
    icone: '🐟',
    grupo: 'producao',
    cor: '#06b6d4',
    visivel: true,
    x: -2.2,
    y: 0,
    z: -10.8,
    rot: 0,
    desc: 'Tanque sombreado para tilápia ou lambari com biofiltro compacto. A água trocada aduba a horta e o lodo vai para a composteira.',
    dica: 'Crítico em Ribeirão Preto: sem sombra a água passa de 31 °C e os peixes perdem oxigênio.',
    regra: { tipo: 'maxSolTarde', valor: 1.5, aviso: 'Sol da tarde no tanque aquece a água acima de 32 °C. Recue para a borda da cobertura ou use sombrite 70%.' },
  },
  galinheiro: {
    nome: 'Galinheiro elevado',
    curto: '4 poedeiras · 2 × 3,5 m',
    icone: '🐔',
    grupo: 'producao',
    cor: '#eab308',
    visivel: true,
    x: 1.4,
    y: 0,
    z: -11.0,
    rot: 0,
    desc: 'Dormitório elevado com gaveta de esterco e piquete de areia drenante. Sol da manhã higieniza e a cobertura protege à tarde.',
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
    x: -2.9,
    y: 0,
    z: -9.0,
    rot: 0,
    desc: 'Cinco caixas (45 × 35 × 120 cm) produzindo cerca de 50 g por dia de larvas e adubo (frass) para a horta.',
    dica: 'Obrigatoriamente na sombra fresca, abaixo de 30 °C: sol direto mata a colônia.',
    regra: { tipo: 'maxSol', valor: 1.0, aviso: 'Sol direto mata a colônia de tenébrios. Mova para a sombra da cobertura.' },
  },
  algas_azolla: {
    nome: 'Algas e azolla',
    curto: 'Spirulina + azolla',
    icone: '🫧',
    grupo: 'producao',
    cor: '#10b981',
    visivel: true,
    x: -0.3,
    y: 0,
    z: -11.3,
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
    x: -2.9,
    y: 0,
    z: -11.8,
    rot: 0,
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
    titulo: 'Quarto 1',
    alvo: 8,
    dicas: ['Um canto → 4 paredes.', 'Fotografe o guarda-roupa aberto e o vão da janela.', 'Registre tomadas e interruptores.'],
  },
  banheiro: {
    titulo: 'Banheiro',
    alvo: 8,
    dicas: ['Luz acesa se estiver escuro.', 'Fotografe a parede do chuveiro e a da pia.', 'Mostre o ralo e os registros.'],
  },
  quarto2: {
    titulo: 'Quarto 2',
    alvo: 8,
    dicas: ['Mesma sequência do quarto 1.', 'Se houver armário embutido, abra as portas.'],
  },
  cozinha: {
    titulo: 'Cozinha',
    alvo: 9,
    dicas: ['Fotografe a bancada, o fogão e a geladeira.', 'Mostre a janela e a porta dos fundos.', 'Registre onde ficam água e gás.'],
  },
  corredor: {
    titulo: 'Corredor',
    alvo: 5,
    dicas: ['Fotografe de uma ponta a outra.', 'Inclua as portas dos cômodos.'],
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
