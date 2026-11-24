import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';
import {
  getSunPosition,
  getDaySolarCurve,
  makeBRTDate,
  sunToVector3,
  formatHour,
  compassLabel,
} from './suncalc.js';
import { initWallPlanner } from './wall-planner.js';

// ===== Estado padrão geolocalizado da Casa Maracaju 88 =====
const DEFAULT_STATE = {
  lat: -21.1742,
  lng: -47.8339,
  lotAzimuth: 40, // graus sentido horário a partir do Norte (eixo Frente SO -> Fundo NE)
  dateStr: '2026-06-21', // Solstício de Inverno (pior caso de sombra) ou hoje
  hour: 9.5,
  roofMode: 'mista', // 'sanduiche' | 'mista' | 'nenhuma'
  xrayMode: false,
  showSatellite: true,
  modules: {
    estacao_mesh: {
      name: '01+02 Estação Meteo + Mesh LoRa',
      short: 'Clima + LoRa 915MHz',
      color: '#38bdf8',
      visible: true,
      x: 1.0,
      y: 4.35,
      z: -3.8,
      rot: 0,
      lockedY: true,
      desc: 'Mastro no telhado com sensores Windy (Projeto 01), antena LoRa 915 MHz (Projeto 02) e painel solar 30W voltado ao Norte.',
      tip: 'Ideal: >6h de sol no painel solar e máxima altura livre de obstáculos.',
    },
    horta_15m: {
      name: '03 Horta & Irrigação (Muro 15m)',
      short: 'Setores A (Seco) / B / C (Úmido)',
      color: '#22c55e',
      visible: true,
      x: -3.0,
      y: 0,
      z: 1.0,
      rot: 0,
      desc: 'Floreiras e 3 setores de gotejamento automatizado ao longo dos 15 m do muro esquerdo (sol matinal 8h–12h).',
      tip: 'Setor A (Sul/Frente): alecrim/tomilho. Setor B (Centro): manjericão/flores. Setor C (Norte/Fundo): hortelã/melissa.',
    },
    pergolado_frente: {
      name: '03 Pergolado Uva + Treliça Cabaça',
      short: 'Canteiro Frontal 3×2 m',
      color: '#a855f7',
      visible: true,
      x: -1.7,
      y: 0,
      z: 10.6,
      rot: 0,
      desc: 'Pergolado baixo para uva BRS Vitória + treliça de cabaça no muro frontal, preservando faixa de sol pleno para lavanda e flor-do-deserto.',
      tip: 'Exige sol pleno (5–6h+) para adoçar a uva e frutificar a cabaça.',
    },
    churrasco: {
      name: 'Área de Churrasco & Convivência',
      short: 'Fundo Coberto (Zona Social)',
      color: '#f59e0b',
      visible: true,
      x: 1.7,
      y: 0,
      z: -8.3,
      rot: 0,
      desc: 'Churrasqueira, pia e bancada de apoio sob a telha sanduíche (conforto térmico no calor de Ribeirão Preto).',
      tip: 'Fica no lado mais ventilado e próximo ao acesso da casa (integração visual com interiores).',
    },
    oficina: {
      name: 'Oficina & Bancada de Ferramentas',
      short: 'Infraestrutura Construtiva',
      color: '#f97316',
      visible: true,
      x: -0.9,
      y: 0,
      z: -8.4,
      rot: 0,
      desc: 'Bancada 1,60 × 0,65 m + painel perfurado + tomada 20A sob a área coberta. Base para fabricar a horta, tanque e galinheiro.',
      tip: 'Prioridade Fase 1: montar logo após a cobertura dos fundos.',
    },
    emergencia_72h: {
      name: 'Estação de Emergência 72h',
      short: 'Água 60L + LiFePO4 + Rádio/Mesh',
      color: '#ef4444',
      visible: true,
      x: -2.4,
      y: 0,
      z: -7.6,
      rot: 0,
      desc: 'Armário vertical protegido do calor/chuva com galões de água potável, banco LiFePO4 12V (backup do Mesh e dos peixes!), mantimentos e kit primeiros socorros.',
      tip: 'Manter 100% à sombra e longe do calor da churrasqueira.',
    },
    tanque_peixes: {
      name: 'Tanque de Peixes / Aquaponia',
      short: '500–1000 L + Biofiltro (Sombra)',
      color: '#06b6d4',
      visible: true,
      x: -2.2,
      y: 0,
      z: -10.8,
      rot: 0,
      desc: 'Tanque sombreado para tilápia/lambari com biofiltro compacto; água rica em nitratos abastece a horta e o lodo vai para a composteira.',
      tip: 'CRÍTICO em Ribeirão Preto: precisa de sombra parcial/cobertura para a água não passar de 31 °C!',
    },
    galinheiro: {
      name: '04 Galinheiro Elevado + Piquete',
      short: '4 Poedeiras (2×3,5 m)',
      color: '#eab308',
      visible: true,
      x: 1.4,
      y: 0,
      z: -11.0,
      rot: 0,
      desc: 'Dormitório elevado com gaveta de esterco + piquete drenante de areia (Projeto 04). Sol matinal higieniza, cobertura protege à tarde.',
      tip: 'Ideal: 2–4h de sol da manhã e sombra obrigatória após 13h.',
    },
    tenebrios: {
      name: '04 Torre de Tenébrios',
      short: 'Biofábrica Proteína (Sombra!)',
      color: '#d97706',
      visible: true,
      x: -2.9,
      y: 0,
      z: -9.0,
      rot: 0,
      desc: 'Torre de 5 caixas (45×35×120 cm) produzindo ~50g/dia de larvas + adubo frass para a horta.',
      tip: 'OBRIGATÓRIO 100% na sombra fresca (<30 °C) — sol direto mata a colônia!',
    },
    algas_azolla: {
      name: '04 Biofábrica Algas / Azolla',
      short: 'Spirulina + Azolla (Anti-Dengue)',
      color: '#10b981',
      visible: true,
      x: -0.3,
      y: 0,
      z: -11.3,
      rot: 0,
      desc: 'Bancada 1,20 × 0,60 m com fotorreator de Spirulina e tanque telado de Azolla para alimentar galinhas e peixes.',
      tip: 'Ideal: 3–5h de sol filtrado (meia-sombra / sombrite 50%).',
    },
    composteira: {
      name: 'Composteira 3 Baias / Minhocário',
      short: 'Ciclo Orgânico Fechado',
      color: '#84cc16',
      visible: true,
      x: -2.9,
      y: 0,
      z: -11.8,
      rot: 0,
      desc: 'Recicla restos da cozinha, podas da horta, esterco das galinhas e lodo do filtro de peixes gerando húmus rico.',
      tip: 'Manter em local sombreado para proteger as minhocas do calor.',
    },
  },
};

let state = loadInitialState();
let selectedModuleId = 'horta_15m';
let animatingSun = false;

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function loadInitialState() {
  try {
    const saved = localStorage.getItem('maracaju3d_state_v1');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...clone(DEFAULT_STATE),
        ...parsed,
        modules: { ...clone(DEFAULT_STATE.modules), ...(parsed.modules || {}) },
      };
    }
  } catch {
    // fallback default
  }
  return clone(DEFAULT_STATE);
}

function persistState() {
  localStorage.setItem('maracaju3d_state_v1', JSON.stringify(state));
}

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.remove('show'), 3200);
}

// ===== Inicialização Three.js =====
const canvas = document.getElementById('canvas3d');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'default' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1523);
scene.fog = new THREE.FogExp2(0x0b1523, 0.0085);

const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 250);
camera.position.set(16, 17, 19);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI * 0.49;
controls.minDistance = 4;
controls.maxDistance = 65;
controls.target.set(0, 1.2, -1);

// Luzes
const hemiLight = new THREE.HemisphereLight(0xaad4ff, 0x2a3126, 0.55);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xfff5dc, 2.3);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 95;
const shadowBounds = 22;
sunLight.shadow.camera.left = -shadowBounds;
sunLight.shadow.camera.right = shadowBounds;
sunLight.shadow.camera.top = shadowBounds;
sunLight.shadow.camera.bottom = -shadowBounds;
sunLight.shadow.bias = -0.0005;
scene.add(sunLight);
scene.add(sunLight.target);

// Esfera do Sol + Arco Solar
const sunSphere = new THREE.Mesh(
  new THREE.SphereGeometry(1.1, 20, 20),
  new THREE.MeshBasicMaterial({ color: 0xfde047 })
);
scene.add(sunSphere);

let sunArcLine = null;

// Chão global + Satélite
const worldGround = new THREE.Mesh(
  new THREE.PlaneGeometry(140, 140),
  new THREE.MeshStandardMaterial({ color: 0x101821, roughness: 0.95 })
);
worldGround.rotation.x = -Math.PI / 2;
worldGround.position.y = -0.05;
worldGround.receiveShadow = true;
scene.add(worldGround);

const gridHelper = new THREE.GridHelper(60, 30, 0x26384d, 0x172331);
gridHelper.position.y = -0.03;
scene.add(gridHelper);

// Overlay Satélite (alinhado ao Norte verdadeiro!)
const satTexture = new THREE.TextureLoader().load('./assets/satelite-maracaju-88.jpg');
satTexture.colorSpace = THREE.SRGBColorSpace;
const satellitePlane = new THREE.Mesh(
  new THREE.PlaneGeometry(34, 41),
  new THREE.MeshBasicMaterial({
    map: satTexture,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  })
);
satellitePlane.rotation.x = -Math.PI / 2;
satellitePlane.position.set(0.5, -0.02, -0.5);
scene.add(satellitePlane);

// Rosa dos Ventos 3D (Norte Verdadeiro = -Z)
function buildCompassRose() {
  const g = new THREE.Group();
  const radius = 16.5;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius - 0.12, radius + 0.12, 64),
    new THREE.MeshBasicMaterial({ color: 0x334e68, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  g.add(ring);

  // Seta Norte vermelha
  const arrowN = new THREE.Mesh(
    new THREE.ConeGeometry(0.65, 1.8, 4),
    new THREE.MeshBasicMaterial({ color: 0xef4444 })
  );
  arrowN.rotation.x = -Math.PI / 2;
  arrowN.position.set(0, 0.15, -radius - 0.9);
  g.add(arrowN);

  const dirs = [
    { txt: 'N (NORTE)', x: 0, z: -radius - 2.6, color: '#ef4444' },
    { txt: 'S (SUL)', x: 0, z: radius + 1.8, color: '#94a3b8' },
    { txt: 'L (LESTE)', x: radius + 2.2, z: 0, color: '#fde047' },
    { txt: 'O (OESTE)', x: -radius - 2.2, z: 0, color: '#38bdf8' },
  ];
  dirs.forEach((d) => {
    const sprite = makeTextSprite(d.txt, d.color, 34);
    sprite.position.set(d.x, 0.7, d.z);
    g.add(sprite);
  });
  return g;
}

function makeTextSprite(text, color = '#ffffff', fontSize = 28) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext('2d');
  ctx.font = `bold ${fontSize}px Segoe UI, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 32);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const sp = new THREE.Sprite(mat);
  sp.scale.set(4.0, 1.0, 1);
  return sp;
}

scene.add(buildCompassRose());

// ===== Grupo do Lote (rotacionado pelo Azimute real da Casa Maracaju 88) =====
const lotGroup = new THREE.Group();
scene.add(lotGroup);

const shadowOccluders = []; // objetos que bloqueiam sol no cálculo analítico

function addBox(parent, w, h, d, x, y, z, color, opts = {}) {
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.8,
    metalness: opts.metalness ?? 0.08,
    transparent: Boolean(opts.transparent),
    opacity: opts.opacity ?? 1,
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = opts.castShadow ?? true;
  mesh.receiveShadow = opts.receiveShadow ?? true;
  parent.add(mesh);
  if (opts.occluder) shadowOccluders.push(mesh);
  return mesh;
}

// Piso do lote (7m x 25m)
addBox(lotGroup, 7.0, 0.08, 25.0, 0, -0.02, 0, 0x2c353f, { castShadow: false });
// Calçada + Rua Maracaju (Frente +Z)
addBox(lotGroup, 9.0, 0.06, 3.2, 0, -0.04, 14.2, 0x1b2026, { castShadow: false });
const streetLabel = makeTextSprite('Rua Maracaju (Frente SO)', '#94a3b8', 22);
streetLabel.position.set(0, 0.4, 14.3);
lotGroup.add(streetLabel);

// Muros de divisa (altura real ~2.4m)
// Muro Esquerdo (15m corredor + frente + fundo)
addBox(lotGroup, 0.16, 2.4, 25.0, -3.45, 1.2, 0, 0xb8afa3, { occluder: true });
// Muro Direito (divisa)
addBox(lotGroup, 0.16, 2.4, 25.0, 3.45, 1.2, 0, 0xa89f93, { occluder: true });
// Muro dos Fundos (NE)
addBox(lotGroup, 7.0, 2.6, 0.18, 0, 1.3, -12.45, 0xa89f93, { occluder: true });
// Portão / Muro Frontal (Rua Maracaju)
addBox(lotGroup, 7.0, 1.8, 0.15, 0, 0.9, 12.45, 0x64748b, { occluder: true });

// Canteiro Frontal (3m x 2m) - Terra Roxa + Acerola existente
addBox(lotGroup, 3.0, 0.18, 2.0, -1.7, 0.09, 10.7, 0x5c3424, { castShadow: false });
// Acerola existente (esfera verde)
const acerola = new THREE.Mesh(
  new THREE.SphereGeometry(0.55, 14, 14),
  new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.9 })
);
acerola.position.set(-2.6, 0.85, 11.1);
acerola.castShadow = true;
lotGroup.add(acerola);

// ===== Casa Vagão (Lado direito, 4.85m x 15m, deixando corredor de 1.9m no muro esquerdo) =====
const houseWallsGroup = new THREE.Group();
lotGroup.add(houseWallsGroup);

// Paredes externas da Casa Vagão (x: -1.45 a +3.35, z: -6.5 a +8.5)
const wallColor = 0xe2ddd5;
// Parede esquerda (corredor)
addBox(houseWallsGroup, 0.18, 3.0, 15.0, -1.45, 1.5, 1.0, wallColor, { occluder: true });
// Parede frontal (+Z = +8.5)
addBox(houseWallsGroup, 4.8, 3.0, 0.18, 0.95, 1.5, 8.5, wallColor, { occluder: true });
// Parede traseira (-Z = -6.5)
addBox(houseWallsGroup, 4.8, 3.0, 0.18, 0.95, 1.5, -6.5, wallColor, { occluder: true });
// Parede direita (+X = +3.35)
addBox(houseWallsGroup, 0.18, 3.0, 15.0, 3.35, 1.5, 1.0, wallColor, { occluder: true });

// Janelas voltadas para o corredor esquerdo (ajuda a ver entrada de sol!)
[-3.5, 0.5, 4.5, 7.0].forEach((zWin) => {
  addBox(houseWallsGroup, 0.22, 1.1, 1.2, -1.46, 1.65, zWin, 0x38bdf8, {
    roughness: 0.2,
    metalness: 0.5,
    castShadow: false,
  });
});

// Divisórias internas (visíveis no Modo Raio-X — Matheus & Scarlet!)
const interiorGroup = new THREE.Group();
lotGroup.add(interiorGroup);
// Piso cerâmico interno
addBox(interiorGroup, 4.6, 0.05, 14.8, 0.95, 0.04, 1.0, 0xcbd5e1, { castShadow: false });
// Divisórias: Sala (frente), Quarto 1, Banheiro, Quarto 2, Cozinha/Copa (fundo)
[4.6, 0.8, -1.2, -3.8].forEach((zDiv) => {
  addBox(interiorGroup, 4.6, 2.75, 0.12, 0.95, 1.38, zDiv, 0xf1f5f9, { castShadow: false });
});
const roomLabels = [
  { t: 'Sala', z: 6.6 },
  { t: 'Quarto 1', z: 2.7 },
  { t: 'Banho', z: -0.2 },
  { t: 'Quarto 2', z: -2.5 },
  { t: 'Cozinha', z: -5.1 },
];
roomLabels.forEach((r) => {
  const sp = makeTextSprite(r.t, '#0f172a', 26);
  sp.position.set(1.0, 1.9, r.z);
  sp.scale.set(2.4, 0.6, 1);
  interiorGroup.add(sp);
});
interiorGroup.visible = false;

// Telhado cerâmico da Casa Vagão (duas águas simplificadas)
const houseRoofGroup = new THREE.Group();
lotGroup.add(houseRoofGroup);

const roofMat = new THREE.MeshStandardMaterial({ color: 0x8c4a32, roughness: 0.85 });
const roofL = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.14, 15.6), roofMat);
roofL.position.set(-0.2, 3.42, 1.0);
roofL.rotation.z = 0.26;
roofL.castShadow = true;
roofL.receiveShadow = true;
houseRoofGroup.add(roofL);
shadowOccluders.push(roofL);

const roofR = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.14, 15.6), roofMat);
roofR.position.set(2.1, 3.42, 1.0);
roofR.rotation.z = -0.26;
roofR.castShadow = true;
roofR.receiveShadow = true;
houseRoofGroup.add(roofR);
shadowOccluders.push(roofR);

// ===== Cobertura Planejada dos Fundos (16 m²+ : 6.7m x 3.2m = ~21m² ou 4x4m configurável) =====
const backyardRoofGroup = new THREE.Group();
lotGroup.add(backyardRoofGroup);

// Pilares metálicos
[
  [-3.2, -9.8],
  [0.0, -9.8],
  [3.2, -9.8],
].forEach(([px, pz]) => {
  addBox(backyardRoofGroup, 0.12, 2.85, 0.12, px, 1.42, pz, 0x334155);
});

const backRoofMainMat = new THREE.MeshStandardMaterial({
  color: 0xdbeafe,
  roughness: 0.5,
  metalness: 0.25,
});
const backRoofMain = new THREE.Mesh(new THREE.BoxGeometry(6.7, 0.08, 3.4), backRoofMainMat);
backRoofMain.position.set(0, 2.92, -8.2);
backRoofMain.rotation.x = -0.06;
backRoofMain.castShadow = true;
backRoofMain.receiveShadow = true;
backyardRoofGroup.add(backRoofMain);
shadowOccluders.push(backRoofMain);

const backRoofTransMat = new THREE.MeshStandardMaterial({
  color: 0xbae6fd,
  roughness: 0.2,
  transparent: true,
  opacity: 0.42,
});
const backRoofTrans = new THREE.Mesh(new THREE.BoxGeometry(6.7, 0.06, 1.0), backRoofTransMat);
backRoofTrans.position.set(0, 2.81, -10.35);
backRoofTrans.rotation.x = -0.06;
backRoofTrans.castShadow = false;
backyardRoofGroup.add(backRoofTrans);

// ===== Construção dos 11 Módulos do Ecossistema =====
const moduleMeshes = {};
const pickables = [];

function createModuleGroup(id, cfg) {
  const g = new THREE.Group();
  g.userData.moduleId = id;
  const c = new THREE.Color(cfg.color);

  if (id === 'estacao_mesh') {
    // Mastro + Painel Solar + Anemômetro + Antena LoRa
    addBox(g, 0.08, 2.2, 0.08, 0, 1.1, 0, 0xcbd5e1);
    const panel = addBox(g, 0.55, 0.04, 0.45, 0, 1.25, -0.15, 0x1d4ed8);
    panel.rotation.x = -0.38; // inclinado ao Norte!
    addBox(g, 0.32, 0.24, 0.18, 0, 0.7, 0.15, 0xf8fafc); // caixa IP65
    addBox(g, 0.04, 0.65, 0.04, 0, 2.35, 0, 0x38bdf8); // antena 915MHz
    addBox(g, 0.5, 0.05, 0.05, 0, 1.85, 0, 0xf8fafc); // braço sensores
  } else if (id === 'horta_15m') {
    // 3 setores ao longo dos 15 m do muro esquerdo
    // Setor A (Sul/Frente — Seco)
    addBox(g, 0.45, 0.45, 4.4, 0, 0.65, 4.8, 0x92400e);
    addBox(g, 0.4, 0.28, 4.2, 0, 1.0, 4.8, 0xa3e635);
    // Setor B (Centro — Moderado)
    addBox(g, 0.45, 0.45, 5.2, 0, 0.65, 0.0, 0x78350f);
    addBox(g, 0.4, 0.34, 5.0, 0, 1.02, 0.0, 0x22c55e);
    // Setor C (Norte/Fundo — Úmido, vasos isolados)
    [-3.4, -4.4, -5.4, -6.4].forEach((zv) => {
      addBox(g, 0.45, 0.42, 0.65, 0, 0.24, zv, 0x0369a1);
      addBox(g, 0.38, 0.35, 0.58, 0, 0.6, zv, 0x10b981);
    });
    // Linha de irrigação azul
    addBox(g, 0.05, 0.05, 14.4, 0.22, 0.9, 0.2, 0x38bdf8);
  } else if (id === 'pergolado_frente') {
    // 4 pilares + ripado de madeira + folhagem de uva
    [
      [-1.1, -0.75],
      [1.1, -0.75],
      [-1.1, 0.75],
      [1.1, 0.75],
    ].forEach(([px, pz]) => addBox(g, 0.1, 2.2, 0.1, px, 1.1, pz, 0x7c2d12));
    for (let z = -0.75; z <= 0.75; z += 0.3) {
      addBox(g, 2.3, 0.07, 0.07, 0, 2.22, z, 0x9a3412);
    }
    addBox(g, 2.1, 0.14, 1.35, 0, 2.32, 0, 0x15803d, { opacity: 0.85, transparent: true });
  } else if (id === 'galinheiro') {
    // Piquete telado + Dormitório elevado (Projeto 04)
    addBox(g, 3.2, 1.9, 1.8, 0, 0.95, 0, 0xfef08a, { transparent: true, opacity: 0.22, castShadow: false });
    addBox(g, 3.2, 0.1, 1.8, 0, 0.05, 0, 0xd6b88d, { castShadow: false }); // areia drenante
    // Casinha elevada
    addBox(g, 1.2, 1.0, 1.5, 0.95, 1.25, 0, 0xb45309);
    const coopRoof = addBox(g, 1.45, 0.08, 1.75, 0.95, 1.85, 0, 0xe2e8f0);
    coopRoof.rotation.z = 0.14;
    // Ninho externo
    addBox(g, 0.35, 0.4, 0.65, 1.65, 1.0, 0, 0x92400e);
  } else if (id === 'tenebrios') {
    // Estante 5 caixas
    for (let i = 0; i < 5; i++) {
      addBox(g, 0.45, 0.14, 0.35, 0, 0.18 + i * 0.22, 0, 0xd97706);
    }
  } else if (id === 'algas_azolla') {
    // Bancada + 2 garrafões Spirulina + tanque Azolla
    addBox(g, 1.2, 0.75, 0.65, 0, 0.38, 0, 0x475569);
    const cylMat = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.3 });
    [-0.38, -0.14].forEach((cx) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.48, 14), cylMat);
      m.position.set(cx, 1.0, 0);
      m.castShadow = true;
      g.add(m);
    });
    addBox(g, 0.58, 0.22, 0.52, 0.26, 0.87, 0, 0x10b981); // bandeja Azolla
  } else if (id === 'tanque_peixes') {
    // Caixa 500-1000L + biofiltro lateral + cama de cultivo
    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 0.58, 0.85, 22),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 })
    );
    tank.position.set(0, 0.43, 0);
    tank.castShadow = true;
    g.add(tank);
    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(0.61, 0.61, 0.04, 22),
      new THREE.MeshStandardMaterial({ color: 0x22d3ee, roughness: 0.15, metalness: 0.3 })
    );
    water.position.set(0, 0.84, 0);
    g.add(water);
    // Biofiltro tambor
    const filt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.8, 16),
      new THREE.MeshStandardMaterial({ color: 0x1e3a8a })
    );
    filt.position.set(0.85, 0.4, -0.2);
    filt.castShadow = true;
    g.add(filt);
  } else if (id === 'composteira') {
    // 3 baias madeira/palete
    [-0.4, 0, 0.4].forEach((cx) => {
      addBox(g, 0.36, 0.65, 0.48, cx, 0.33, 0, 0x65a30d);
    });
  } else if (id === 'churrasco') {
    // Bancada L + churrasqueira alvenaria + chaminé
    addBox(g, 1.8, 0.9, 0.65, 0, 0.45, 0, 0x64748b);
    addBox(g, 0.85, 2.35, 0.72, 0.95, 1.18, 0, 0x991b1b);
    addBox(g, 0.4, 0.9, 0.4, 0.95, 2.6, 0, 0x7f1d1d);
  } else if (id === 'oficina') {
    // Bancada robusta + pegboard parede
    addBox(g, 1.65, 0.88, 0.68, 0, 0.44, 0, 0x9a3412);
    addBox(g, 1.7, 0.08, 0.72, 0, 0.9, 0, 0xf97316);
    addBox(g, 1.5, 0.85, 0.06, 0, 1.5, -0.32, 0x334155); // painel ferramentas
  } else if (id === 'emergencia_72h') {
    // Armário vertical vermelho/cinza + bateria + galões
    addBox(g, 0.85, 1.75, 0.52, 0, 0.92, 0, 0x334155);
    addBox(g, 0.87, 0.25, 0.54, 0, 1.68, 0, 0xef4444); // faixa emergência
    addBox(g, 0.26, 0.36, 0.26, -0.22, 0.25, 0.34, 0x38bdf8); // galão 20L
    addBox(g, 0.26, 0.36, 0.26, 0.16, 0.25, 0.34, 0x22c55e); // banco LiFePO4
  } else {
    addBox(g, 1, 1, 1, 0, 0.5, 0, c);
  }

  // Halo de seleção no chão
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.85, 1.0, 28),
    new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  ring.name = 'selectionRing';
  ring.visible = false;
  g.add(ring);

  g.traverse((obj) => {
    if (obj.isMesh) {
      obj.userData.moduleId = id;
      pickables.push(obj);
    }
  });

  lotGroup.add(g);
  return g;
}

Object.entries(state.modules).forEach(([id, cfg]) => {
  moduleMeshes[id] = createModuleGroup(id, cfg);
});

// ===== Importador de Scan 3D Real (.glb, .gltf, .obj, .ply) =====
const importedScanGroup = new THREE.Group();
lotGroup.add(importedScanGroup);
let importedScanRoot = null;

const gltfLoader = new GLTFLoader();
const objLoader = new OBJLoader();
const plyLoader = new PLYLoader();

function loadUserScanFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const url = URL.createObjectURL(file);

  const onLoaded = (obj) => {
    if (importedScanRoot) {
      importedScanGroup.remove(importedScanRoot);
    }
    // Normaliza centro e base no chão (Y=0)
    const box = new THREE.Box3().setFromObject(obj);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    obj.position.set(-center.x, -box.min.y, -center.z);

    // Se vier muito grande ou muito pequeno, sugere escala inicial amigável
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    let initScale = 1.0;
    if (maxDim > 40) initScale = +(12 / maxDim).toFixed(3);
    else if (maxDim < 0.8) initScale = +(4 / maxDim).toFixed(2);

    obj.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    const wrapper = new THREE.Group();
    wrapper.add(obj);
    importedScanRoot = wrapper;
    importedScanGroup.add(wrapper);

    document.getElementById('scanScale').value = initScale;
    document.getElementById('scanScaleVal').textContent = initScale + 'x';
    document.getElementById('scanControls').style.display = 'block';
    document.getElementById('scanFileName').textContent = file.name;
    applyScanTransform();
    showToast(`Scan 3D "${file.name}" carregado! Ajuste escala e rotação Norte no painel.`);
    URL.revokeObjectURL(url);
  };

  if (ext === 'glb' || ext === 'gltf') {
    gltfLoader.load(url, (gltf) => onLoaded(gltf.scene), undefined, () => showToast('Erro ao ler GLB/GLTF.'));
  } else if (ext === 'obj') {
    objLoader.load(url, (obj) => onLoaded(obj), undefined, () => showToast('Erro ao ler OBJ.'));
  } else if (ext === 'ply') {
    plyLoader.load(
      url,
      (geom) => {
        geom.computeVertexNormals();
        const hasColors = Boolean(geom.attributes.color);
        let obj;
        if (geom.index) {
          obj = new THREE.Mesh(
            geom,
            new THREE.MeshStandardMaterial({ vertexColors: hasColors, color: hasColors ? 0xffffff : 0x94a3b8 })
          );
        } else {
          obj = new THREE.Points(
            geom,
            new THREE.PointsMaterial({ size: 0.06, vertexColors: hasColors, color: hasColors ? 0xffffff : 0x38bdf8 })
          );
        }
        onLoaded(obj);
      },
      undefined,
      () => showToast('Erro ao ler PLY.')
    );
  } else {
    showToast('Formato não suportado. Use .glb, .gltf, .obj ou .ply.');
  }
}

function applyScanTransform() {
  if (!importedScanRoot) return;
  const sc = parseFloat(document.getElementById('scanScale').value) || 1;
  const sx = parseFloat(document.getElementById('scanX').value) || 0;
  const sy = parseFloat(document.getElementById('scanY').value) || 0;
  const sz = parseFloat(document.getElementById('scanZ').value) || 0;
  const srot = parseFloat(document.getElementById('scanRot').value) || 0;

  importedScanRoot.scale.setScalar(sc);
  importedScanRoot.position.set(sx, sy, sz);
  importedScanRoot.rotation.y = THREE.MathUtils.degToRad(srot);
  document.getElementById('scanScaleVal').textContent = sc.toFixed(2) + 'x';
  document.getElementById('scanRotVal').textContent = srot + '°';
}

// ===== Atualização Solar & Análise Geométrica de Horas de Sol =====
const raycaster = new THREE.Raycaster();

function parseDateParts(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return { y: y || 2026, m: m || 6, d: d || 21 };
}

function updateSunAndScene() {
  // Orientação real do lote (Azimute sentido horário a partir do Norte)
  lotGroup.rotation.y = -THREE.MathUtils.degToRad(state.lotAzimuth);
  lotGroup.updateMatrixWorld(true);

  // Satélite
  satellitePlane.visible = state.showSatellite;

  // Modo Raio-X (Interiores com Scarlet)
  houseRoofGroup.visible = !state.xrayMode;
  interiorGroup.visible = state.xrayMode;

  // Cobertura dos fundos
  if (state.roofMode === 'nenhuma') {
    backyardRoofGroup.visible = false;
  } else if (state.roofMode === 'sanduiche') {
    backyardRoofGroup.visible = true;
    backRoofTrans.visible = false;
    backRoofMain.scale.z = 1.25;
    backRoofMain.position.z = -8.6;
  } else {
    backyardRoofGroup.visible = true;
    backRoofTrans.visible = true;
    backRoofMain.scale.z = 1.0;
    backRoofMain.position.z = -8.2;
  }

  // Posições dos módulos
  Object.entries(state.modules).forEach(([id, cfg]) => {
    const mesh = moduleMeshes[id];
    if (!mesh) return;
    mesh.visible = cfg.visible;
    mesh.position.set(cfg.x, cfg.y ?? 0, cfg.z);
    mesh.rotation.y = THREE.MathUtils.degToRad(cfg.rot || 0);
    const ring = mesh.getObjectByName('selectionRing');
    if (ring) ring.visible = id === selectedModuleId;
  });

  // Posição Solar Real
  const { y, m, d } = parseDateParts(state.dateStr);
  const dt = makeBRTDate(y, m, d, state.hour);
  const pos = getSunPosition(dt, state.lat, state.lng);
  const vec = sunToVector3(pos.azimuthRad, Math.max(pos.altitudeRad, -0.05), 36);

  sunLight.position.set(vec.x, vec.y, vec.z);
  sunSphere.position.set(vec.x * 0.95, vec.y * 0.95, vec.z * 0.95);

  const isDay = pos.altitudeDeg > 0;
  sunLight.intensity = isDay ? Math.min(2.6, 0.7 + Math.sin(pos.altitudeRad) * 2.2) : 0.05;
  sunSphere.visible = isDay;
  hemiLight.intensity = isDay ? 0.58 : 0.16;

  // Cor do céu dinâmica
  if (!isDay) {
    scene.background.setHex(0x060b14);
  } else if (pos.altitudeDeg < 14) {
    scene.background.setHex(0x1f1b2e);
    sunLight.color.setHex(0xffb36b);
  } else {
    scene.background.setHex(0x0e1d30);
    sunLight.color.setHex(0xfff6e0);
  }

  // Arco Solar do dia inteiro
  const curve = getDaySolarCurve(y, m, d, state.lat, state.lng);
  if (sunArcLine) {
    scene.remove(sunArcLine);
    sunArcLine.geometry.dispose();
  }
  const arcPts = curve.points
    .filter((p) => p.altitudeDeg >= 0)
    .map((p) => {
      const v = sunToVector3(p.azimuthRad, p.altitudeRad, 32);
      return new THREE.Vector3(v.x, v.y, v.z);
    });
  if (arcPts.length > 1) {
    const arcGeo = new THREE.BufferGeometry().setFromPoints(arcPts);
    sunArcLine = new THREE.Line(
      arcGeo,
      new THREE.LineBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.65 })
    );
    scene.add(sunArcLine);
  }

  // HUD Solar
  document.getElementById('hudTime').textContent = formatHour(state.hour);
  document.getElementById('hudAz').textContent = `${pos.azimuthDeg.toFixed(1)}° (${compassLabel(pos.azimuthDeg)})`;
  document.getElementById('hudAlt').textContent = `${pos.altitudeDeg.toFixed(1)}°`;
  document.getElementById('hudDaylight').textContent = `${formatHour(curve.sunrise)} – ${formatHour(curve.sunset)} (${curve.daylightHours}h)`;

  updateSelectedSolarDiagnostics(curve);
}

/**
 * Calcula horas de sol direto reais no módulo selecionado usando raycasting contra muros, casa e cobertura.
 */
function computeModuleSunHours(moduleId, curve) {
  const m = moduleMeshes[moduleId];
  if (!m) return { hours: 0, afternoonHours: 0 };

  lotGroup.updateMatrixWorld(true);
  const worldPos = new THREE.Vector3();
  m.getWorldPosition(worldPos);
  worldPos.y += 1.05; // altura média de insolação do módulo

  const activeOccluders = shadowOccluders.filter((o) => {
    let p = o;
    while (p) {
      if (!p.visible) return false;
      p = p.parent;
    }
    return true;
  });

  let directSteps = 0;
  let afternoonSteps = 0;
  // Avalia a cada 20 min (passo 2 no array de 10 min)
  for (let i = 0; i < curve.points.length; i += 2) {
    const p = curve.points[i];
    if (p.altitudeDeg < 4) continue;
    const v = sunToVector3(p.azimuthRad, p.altitudeRad, 1);
    const dir = new THREE.Vector3(v.x, v.y, v.z).normalize();
    raycaster.set(worldPos, dir);
    const hits = raycaster.intersectObjects(activeOccluders, false);
    if (hits.length === 0) {
      directSteps++;
      if (p.hour >= 13.0) afternoonSteps++;
    }
  }
  return {
    hours: +((directSteps * 20) / 60).toFixed(1),
    afternoonHours: +((afternoonSteps * 20) / 60).toFixed(1),
  };
}

function updateSelectedSolarDiagnostics(curve) {
  const cfg = state.modules[selectedModuleId];
  if (!cfg) return;
  const stats = computeModuleSunHours(selectedModuleId, curve);

  document.getElementById('selName').textContent = cfg.name;
  document.getElementById('selDesc').textContent = cfg.desc;
  document.getElementById('selSunHours').textContent = `${stats.hours} h/dia`;
  document.getElementById('selAfternoonHours').textContent = `${stats.afternoonHours} h (≥13h)`;

  const alertEl = document.getElementById('selAlert');
  if ((selectedModuleId === 'tenebrios' || selectedModuleId === 'composteira' || selectedModuleId === 'emergencia_72h') && stats.hours > 1.0) {
    alertEl.className = 'alert-box';
    alertEl.textContent = `⚠️ Alerta Ribeirão Preto: este módulo está pegando ${stats.hours}h de sol direto! Mova-o para baixo da área coberta dos fundos (sombra total).`;
  } else if (selectedModuleId === 'tanque_peixes' && stats.afternoonHours > 1.5) {
    alertEl.className = 'alert-box';
    alertEl.textContent = `⚠️ Atenção térmica: ${stats.afternoonHours}h de sol da tarde no tanque podem aquecer a água >32 °C. Recue para a borda da cobertura ou use sombrite 70%.`;
  } else if (selectedModuleId === 'estacao_mesh' && stats.hours < 4.5) {
    alertEl.className = 'alert-box';
    alertEl.textContent = `⚠️ Painel solar com apenas ${stats.hours}h de sol. Eleve ou centralize o mastro na cumeeira do telhado.`;
  } else {
    alertEl.className = 'alert-box ok';
    alertEl.textContent = `✅ Microclima compatível! ${cfg.tip}`;
  }
}

// ===== UI Bindings =====
function renderModuleList() {
  const list = document.getElementById('moduleList');
  list.innerHTML = '';
  Object.entries(state.modules).forEach(([id, cfg]) => {
    const row = document.createElement('div');
    row.className = 'module-item' + (id === selectedModuleId ? ' selected' : '');
    row.innerHTML = `
      <span class="dot" style="background:${cfg.color}"></span>
      <div class="module-info">
        <div class="title">${cfg.name}</div>
        <div class="sub">${cfg.short}</div>
      </div>
      <input type="checkbox" ${cfg.visible ? 'checked' : ''} title="Mostrar/Ocultar" />
    `;
    row.addEventListener('click', (e) => {
      if (e.target.tagName === 'INPUT') return;
      selectModule(id);
    });
    row.querySelector('input').addEventListener('change', (e) => {
      state.modules[id].visible = e.target.checked;
      persistState();
      updateSunAndScene();
    });
    list.appendChild(row);
  });
}

function selectModule(id) {
  selectedModuleId = id;
  const cfg = state.modules[id];
  document.getElementById('modX').value = cfg.x;
  document.getElementById('modZ').value = cfg.z;
  document.getElementById('modRot').value = cfg.rot || 0;
  document.getElementById('modXVal').textContent = cfg.x.toFixed(1) + ' m';
  document.getElementById('modZVal').textContent = cfg.z.toFixed(1) + ' m';
  document.getElementById('modRotVal').textContent = (cfg.rot || 0) + '°';
  renderModuleList();
  updateSunAndScene();
}

// Raycast clique 3D para selecionar módulo direto na cena
const pointer = new THREE.Vector2();
let downPos = { x: 0, y: 0 };
canvas.addEventListener('pointerdown', (e) => {
  downPos = { x: e.clientX, y: e.clientY };
});
canvas.addEventListener('pointerup', (e) => {
  if (Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 6) return;
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(pickables, false);
  if (hits.length > 0 && hits[0].object.userData.moduleId) {
    selectModule(hits[0].object.userData.moduleId);
  }
});

// Controles de formulário
function bindUI() {
  const latEl = document.getElementById('inputLat');
  const lngEl = document.getElementById('inputLng');
  const azEl = document.getElementById('inputLotAz');
  const dateEl = document.getElementById('inputDate');
  const hourEl = document.getElementById('inputHour');
  const roofEl = document.getElementById('selectRoofMode');

  latEl.value = state.lat;
  lngEl.value = state.lng;
  azEl.value = state.lotAzimuth;
  document.getElementById('lotAzVal').textContent = state.lotAzimuth + '°';
  dateEl.value = state.dateStr;
  hourEl.value = state.hour;
  roofEl.value = state.roofMode;

  latEl.addEventListener('change', () => {
    state.lat = parseFloat(latEl.value) || -21.1742;
    persistState();
    updateSunAndScene();
  });
  lngEl.addEventListener('change', () => {
    state.lng = parseFloat(lngEl.value) || -47.8339;
    persistState();
    updateSunAndScene();
  });

  // GPS ao vivo do celular (no quintal!)
  const btnGps = document.getElementById('btnUseMyGps');
  if (btnGps) {
    btnGps.addEventListener('click', () => {
      if (!navigator.geolocation) {
        showToast('Geolocalização não suportada neste navegador.');
        return;
      }
      btnGps.textContent = '📡 Buscando GPS...';
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          state.lat = +pos.coords.latitude.toFixed(6);
          state.lng = +pos.coords.longitude.toFixed(6);
          latEl.value = state.lat;
          lngEl.value = state.lng;
          persistState();
          updateSunAndScene();
          btnGps.textContent = '📍 Pegar GPS Atual (No Quintal / Celular)';
          showToast(`GPS atualizado (${state.lat}, ${state.lng} • precisão ±${Math.round(pos.coords.accuracy)} m)!`);
        },
        (err) => {
          btnGps.textContent = '📍 Pegar GPS Atual (No Quintal / Celular)';
          showToast(`Não foi possível ler GPS (${err.message}). Requer HTTPS ou localhost.`);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }
  azEl.addEventListener('input', () => {
    state.lotAzimuth = parseFloat(azEl.value);
    document.getElementById('lotAzVal').textContent = state.lotAzimuth + '°';
    persistState();
    updateSunAndScene();
  });
  dateEl.addEventListener('change', () => {
    state.dateStr = dateEl.value;
    persistState();
    updateSunAndScene();
  });
  hourEl.addEventListener('input', () => {
    state.hour = parseFloat(hourEl.value);
    updateSunAndScene();
  });
  roofEl.addEventListener('change', () => {
    state.roofMode = roofEl.value;
    persistState();
    updateSunAndScene();
  });

  // Atalhos de estação
  document.querySelectorAll('[data-season]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.dateStr = btn.dataset.season;
      dateEl.value = state.dateStr;
      persistState();
      updateSunAndScene();
      showToast(`Simulando data: ${btn.textContent}`);
    });
  });

  // Animar Sol
  const btnPlay = document.getElementById('btnPlaySun');
  btnPlay.addEventListener('click', () => {
    animatingSun = !animatingSun;
    btnPlay.textContent = animatingSun ? '⏸ Pausar Sol' : '▶ Animar Dia';
    btnPlay.classList.toggle('active-chip', animatingSun);
  });

  // Toggles Raio-X e Satélite
  const btnXray = document.getElementById('btnToggleXray');
  btnXray.addEventListener('click', () => {
    state.xrayMode = !state.xrayMode;
    btnXray.classList.toggle('active-chip', state.xrayMode);
    updateSunAndScene();
    showToast(state.xrayMode ? 'Modo Raio-X ativo (Interiores — Matheus & Scarlet)' : 'Telhado restaurado.');
  });

  const btnSat = document.getElementById('btnToggleSat');
  btnSat.classList.toggle('active-chip', state.showSatellite);
  btnSat.addEventListener('click', () => {
    state.showSatellite = !state.showSatellite;
    btnSat.classList.toggle('active-chip', state.showSatellite);
    updateSunAndScene();
  });

  // Sliders do módulo selecionado
  ['modX', 'modZ', 'modRot'].forEach((id) => {
    document.getElementById(id).addEventListener('input', () => {
      const cfg = state.modules[selectedModuleId];
      cfg.x = parseFloat(document.getElementById('modX').value);
      cfg.z = parseFloat(document.getElementById('modZ').value);
      cfg.rot = parseFloat(document.getElementById('modRot').value);
      document.getElementById('modXVal').textContent = cfg.x.toFixed(1) + ' m';
      document.getElementById('modZVal').textContent = cfg.z.toFixed(1) + ' m';
      document.getElementById('modRotVal').textContent = cfg.rot + '°';
      persistState();
      updateSunAndScene();
    });
  });

  // Presets de Câmera
  const camPresets = {
    geral: { pos: [16, 17, 19], target: [0, 1.2, -1] },
    muro: { pos: [6.5, 4.5, 7.5], target: [-2.8, 1.2, 0.5] },
    fundos: { pos: [10.5, 7.5, -15.5], target: [0, 1.0, -9.8] },
    frente: { pos: [-9.5, 6.0, 16.0], target: [-1.2, 1.0, 10.2] },
    topo: { pos: [0.1, 31, 0.1], target: [0, 0, 0] },
  };
  document.querySelectorAll('[data-cam]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = camPresets[btn.dataset.cam];
      if (!p) return;
      camera.position.set(...p.pos);
      controls.target.set(...p.target);
      controls.update();
    });
  });

  // Importar Scan 3D
  document.getElementById('scanFileInput').addEventListener('change', (e) => {
    const f = e.target.files?.[0];
    if (f) loadUserScanFile(f);
  });
  ['scanScale', 'scanX', 'scanY', 'scanZ', 'scanRot'].forEach((id) => {
    document.getElementById(id).addEventListener('input', applyScanTransform);
  });
  document.getElementById('btnRemoveScan').addEventListener('click', () => {
    if (importedScanRoot) {
      importedScanGroup.remove(importedScanRoot);
      importedScanRoot = null;
      document.getElementById('scanControls').style.display = 'none';
      showToast('Scan 3D removido da cena.');
    }
  });

  // Salvar / Exportar / Resetar Cenário
  document.getElementById('btnSaveServer').addEventListener('click', async () => {
    persistState();
    try {
      const res = await fetch('/api/save-layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });
      if (res.ok) showToast('Cenário salvo em cenarios/layout_atual.json!');
      else showToast('Salvo localmente no navegador.');
    } catch {
      showToast('Salvo localmente no navegador.');
    }
  });

  document.getElementById('btnExportJson').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `maracaju-88-cenario-${state.dateStr}.json`;
    a.click();
    showToast('Arquivo JSON do cenário exportado!');
  });

  const importJsonEl = document.getElementById('importJsonInput');
  if (importJsonEl) {
    importJsonEl.addEventListener('change', async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      try {
        const parsed = JSON.parse(await f.text());
        state = {
          ...clone(DEFAULT_STATE),
          ...parsed,
          modules: { ...clone(DEFAULT_STATE.modules), ...(parsed.modules || {}) },
        };
        persistState();
        latEl.value = state.lat;
        lngEl.value = state.lng;
        azEl.value = state.lotAzimuth;
        document.getElementById('lotAzVal').textContent = state.lotAzimuth + '°';
        dateEl.value = state.dateStr;
        hourEl.value = state.hour;
        roofEl.value = state.roofMode;
        selectModule(selectedModuleId);
        showToast(`Cenário "${f.name}" carregado!`);
      } catch {
        showToast('Arquivo JSON inválido.');
      }
      importJsonEl.value = '';
    });
  }

  document.getElementById('btnResetLayout').addEventListener('click', () => {
    state = clone(DEFAULT_STATE);
    persistState();
    latEl.value = state.lat;
    lngEl.value = state.lng;
    azEl.value = state.lotAzimuth;
    dateEl.value = state.dateStr;
    hourEl.value = state.hour;
    roofEl.value = state.roofMode;
    selectModule('horta_15m');
    showToast('Layout padrão da Casa Maracaju 88 restaurado.');
  });

  // Troca de Abas
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
      if (btn.dataset.tab === 'view-3d') resizeRenderer();
      if (btn.dataset.tab === 'view-captures') loadCapturesManifest();
    });
  });
}

// ===== Aba 3: Carregar Capturas GPS do Servidor Local =====
let wallPlannerApi = null;

async function loadCapturesManifest() {
  const grid = document.getElementById('capturesGrid');
  const status = document.getElementById('capturesStatus');
  try {
    const res = await fetch('/api/captures');
    if (!res.ok) throw new Error('offline');
    const data = await res.json();
    const photos = data.photos || [];
    status.textContent =
      photos.length > 0
        ? `${photos.length} foto(s) encontrada(s) em capturas/ (${data.geotagged || 0} com GPS EXIF).`
        : 'Nenhuma foto ainda em capturas/muro/. Tire as fotos do muro em casa, salve na pasta e rode tools/exif_geo_mapper.py!';

    grid.innerHTML = '';
    photos.forEach((p) => {
      const card = document.createElement('div');
      card.className = 'photo-card';
      card.innerHTML = `
        <img src="${p.url}" alt="${p.name}" loading="lazy" />
        <div class="meta">
          <strong style="color:#fff">${p.name}</strong>
          <span>📍 ${p.lat != null ? `${p.lat}, ${p.lng}` : 'Sem GPS'}</span>
          <span>🧭 ${p.compass != null ? `${p.compass}°` : '—'} | 📏 ${p.dist_m != null ? `${p.dist_m} m da casa` : '—'}</span>
          <button class="btn sm blue" style="margin-top:4px">🧱 Abrir no Estúdio do Muro</button>
        </div>
      `;
      card.querySelector('button').addEventListener('click', () => {
        document.querySelector('[data-tab="view-wall"]').click();
        wallPlannerApi.loadPhotoFromUrl(
          p.url,
          p.name,
          `<strong>📍 ${p.name}</strong><br>GPS: ${p.lat ?? '—'}, ${p.lng ?? '—'}<br>Bússola: ${p.compass ?? '—'}°`
        );
      });
      grid.appendChild(card);
    });
  } catch {
    status.textContent = 'Servidor local Python não detectado (use: python run_maracaju_3d.py).';
  }
}

// ===== Resize & Render Loop =====
function resizeRenderer() {
  const wrap = document.querySelector('.stage-wrap');
  const w = wrap.clientWidth || window.innerWidth;
  const h = wrap.clientHeight || 500;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}

window.addEventListener('resize', resizeRenderer);

let lastTs = 0;
function animate(ts) {
  requestAnimationFrame(animate);
  const dt = Math.min((ts - lastTs) / 1000, 0.1);
  lastTs = ts;

  if (animatingSun) {
    state.hour += dt * 1.4;
    if (state.hour > 18.5) state.hour = 5.5;
    document.getElementById('inputHour').value = state.hour;
    updateSunAndScene();
  }

  controls.update();
  renderer.render(scene, camera);
}

// Boot
wallPlannerApi = initWallPlanner(showToast);
bindUI();
selectModule('horta_15m');
resizeRenderer();
requestAnimationFrame(animate);
