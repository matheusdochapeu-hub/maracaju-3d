/**
 * mundo.js — A cena 3D: terreno, muros, módulos, casa, telhado, sol e satélite.
 *
 * Este módulo é dono do renderer e da câmera. Ele não sabe nada de abas ou
 * botões: recebe o estado por uma função (`obterEstado`) e avisa quem chamou
 * quando o sol muda (`aoAtualizarSol`). Assim a UI fica livre para mudar sem
 * quebrar o 3D.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';
import { getSunPosition, getDaySolarCurve, makeBRTDate, sunToVector3, formatHour, compassLabel } from './suncalc.js';
import { MODULOS } from './config.js';
import { construirCasa } from './casa-3d.js';

const AZIMUTE_PADRAO = 39;
// Todos os presets abaixo estão no referencial LOCAL do lote:
// +Z = Frente (Rua Maracaju) | -Z = Fundo (Cap. Pereira Lago)
// -X = Esquerda (Muro plantas / Visconde de Taunay) | +X = Direita (Vizinha esquina / Machado de Assis)
const PRESETS = {
  geral: { pos: [-1.5, 16.5, 24.5], alvo: [0.6, 1.2, -2.0] },
  frente: { pos: [0.5, 5.4, 19.5], alvo: [0.6, 1.3, 8.2] },
  muro: { pos: [-0.8, 5.2, 5.5], alvo: [-1.5, 1.1, -5.0] },
  fundos: { pos: [-6.5, 8.5, -24.5], alvo: [0.8, 1.2, -14.8] },
  topo: { pos: [0.6, 38.0, 2.5], alvo: [0.6, 0.0, -3.0] },
  casa: { pos: [-7.5, 18.0, 9.5], alvo: [0.7, 0.8, -2.15] },
  planta: { pos: [0.7, 32.0, -2.15], alvo: [0.7, 0.0, -2.15] },
};

export function criarMundo({ obterEstado, obterCasa, aoSelecionarModulo, aoSelecionarMovel, aoAtualizarSol }) {
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

  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 260);
  camera.position.set(...PRESETS.geral.pos);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.minDistance = 2.5;
  controls.maxDistance = 70;
  controls.target.set(...PRESETS.geral.alvo);

  const hemi = new THREE.HemisphereLight(0xaad4ff, 0x2a3126, 0.55);
  scene.add(hemi);

  const luzInterna = new THREE.PointLight(0xffe1b5, 0, 14, 1.35);
  luzInterna.position.set(0.7, 2.45, -2.0);
  scene.add(luzInterna);

  const sol = new THREE.DirectionalLight(0xfff5dc, 2.3);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  sol.shadow.camera.near = 1;
  sol.shadow.camera.far = 95;
  const limiteSombra = 30;
  sol.shadow.camera.left = -limiteSombra;
  sol.shadow.camera.right = limiteSombra;
  sol.shadow.camera.top = limiteSombra;
  sol.shadow.camera.bottom = -limiteSombra;
  sol.shadow.bias = -0.0005;
  scene.add(sol, sol.target);

  const esferaSol = new THREE.Mesh(
    new THREE.SphereGeometry(1.1, 20, 20),
    new THREE.MeshBasicMaterial({ color: 0xfde047 })
  );
  scene.add(esferaSol);

  let arcoSolar = null;

  // ---------- Chão, grade e satélite ----------
  const chao = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 160),
    new THREE.MeshStandardMaterial({ color: 0x101821, roughness: 0.95 })
  );
  chao.rotation.x = -Math.PI / 2;
  chao.position.y = -0.06;
  chao.receiveShadow = true;
  scene.add(chao);

  const grade = new THREE.GridHelper(60, 30, 0x26384d, 0x172331);
  grade.position.y = -0.04;
  scene.add(grade);

  const texturaSatelite = new THREE.TextureLoader().load('./assets/satelite-maracaju-88.jpg');
  texturaSatelite.colorSpace = THREE.SRGBColorSpace;
  const planoSatelite = new THREE.Mesh(
    new THREE.PlaneGeometry(34, 41),
    new THREE.MeshBasicMaterial({ map: texturaSatelite, transparent: true, opacity: 0.42, depthWrite: false })
  );
  planoSatelite.rotation.x = -Math.PI / 2;
  planoSatelite.position.set(0.5, -0.02, -0.5);
  scene.add(planoSatelite);

  // ---------- Rosa dos ventos ----------
  const rosa = new THREE.Group();
  {
    const raio = 19.5;
    const anel = new THREE.Mesh(
      new THREE.RingGeometry(raio - 0.12, raio + 0.12, 64),
      new THREE.MeshBasicMaterial({ color: 0x334e68, side: THREE.DoubleSide })
    );
    anel.rotation.x = -Math.PI / 2;
    anel.position.y = 0.02;
    rosa.add(anel);
    const seta = new THREE.Mesh(
      new THREE.ConeGeometry(0.65, 1.8, 4),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    seta.rotation.x = -Math.PI / 2;
    seta.position.set(0, 0.15, -raio - 0.9);
    rosa.add(seta);
    const pontos = [
      { txt: 'N', x: 0, z: -raio - 2.6, cor: '#ef4444' },
      { txt: 'S', x: 0, z: raio + 1.8, cor: '#94a3b8' },
      { txt: 'L', x: raio + 2.2, z: 0, cor: '#fde047' },
      { txt: 'O', x: -raio - 2.2, z: 0, cor: '#38bdf8' },
    ];
    pontos.forEach((p) => {
      const s = etiquetaTexto(p.txt, p.cor, 40, 4);
      s.position.set(p.x, 0.7, p.z);
      rosa.add(s);
    });
    scene.add(rosa);
  }

  function etiquetaTexto(texto, cor = '#ffffff', tamanho = 30, escalaX = 4.2, fundo = null) {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 96;
    const ctx = c.getContext('2d');
    if (fundo) {
      ctx.fillStyle = fundo;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(10, 12, 492, 72, 16);
      else ctx.rect(10, 12, 492, 72);
      ctx.fill();
    }
    ctx.font = `bold ${tamanho}px Segoe UI, system-ui, sans-serif`;
    ctx.fillStyle = cor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(texto, 256, 48);
    const textura = new THREE.CanvasTexture(c);
    textura.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: textura, transparent: true, depthTest: false }));
    sprite.scale.set(escalaX, (escalaX * 96) / 512, 1);
    return sprite;
  }

  // ---------- Lote (frente real ~5,50 m × 31 m: x = -2,05 a +3,45 | z = -18,55 a +12,45) ----------
  const lote = new THREE.Group();
  scene.add(lote);
  const grupoEntorno = new THREE.Group();
  lote.add(grupoEntorno);
  const occludersLote = [];

  function caixa(parent, w, h, d, x, y, z, cor, opts = {}) {
    const material = new THREE.MeshStandardMaterial({
      color: cor,
      roughness: opts.roughness ?? 0.8,
      metalness: opts.metalness ?? 0.06,
      transparent: Boolean(opts.transparent),
      opacity: opts.opacity ?? 1,
    });
    const malha = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    malha.position.set(x, y, z);
    malha.castShadow = opts.castShadow ?? true;
    malha.receiveShadow = opts.receiveShadow ?? true;
    parent.add(malha);
    if (opts.occluder) occludersLote.push(malha);
    return malha;
  }

  // Piso do terreno (5,50 m largura × 31,0 m profundidade)
  caixa(grupoEntorno, 5.5, 0.08, 31.0, 0.7, -0.02, -3.05, 0x2c353f, { castShadow: false });

  // Rua Maracaju (Frente +Z) + Calçada
  caixa(grupoEntorno, 16.0, 0.06, 3.8, 2.2, -0.04, 15.1, 0x1b2026, { castShadow: false });
  caixa(grupoEntorno, 16.0, 0.07, 1.0, 2.2, -0.02, 13.0, 0x475569, { castShadow: false });

  // Silhueta translúcida da casa da vizinha de esquina (lado DIREITO +X, sentido Rua Machado de Assis)
  caixa(grupoEntorno, 6.2, 3.2, 18.0, 6.8, 1.6, -1.0, 0x334155, {
    transparent: true,
    opacity: 0.24,
    castShadow: true,
    receiveShadow: false,
    occluder: true,
  });
  const rotVizinha = etiquetaTexto('Vizinha (Esquina)', '#cbd5e1', 26, 4.8, 'rgba(15,23,42,0.75)');
  rotVizinha.position.set(6.8, 3.7, -1.0);
  grupoEntorno.add(rotVizinha);

  // Placas das 4 ruas de referência (tudo dentro do terreno — ruas são só referência cardinal!)
  const rotRuaFrente = etiquetaTexto('FRENTE: Rua Maracaju', '#f8fafc', 30, 6.2, 'rgba(15,23,42,0.85)');
  rotRuaFrente.position.set(0.7, 0.65, 15.2);
  grupoEntorno.add(rotRuaFrente);

  const rotRuaFundo = etiquetaTexto('FUNDO · Sentido Rua Capitão Pereira Lago', '#38bdf8', 24, 7.6, 'rgba(15,23,42,0.82)');
  rotRuaFundo.position.set(0.7, 0.9, -20.6);
  grupoEntorno.add(rotRuaFundo);

  const rotRuaDir = etiquetaTexto('DIREITA → Sentido Rua Machado de Assis', '#fbbf24', 24, 7.6, 'rgba(15,23,42,0.82)');
  rotRuaDir.position.set(8.2, 0.9, 10.6);
  grupoEntorno.add(rotRuaDir);

  const rotRuaEsq = etiquetaTexto('← ESQUERDA: Muro Plantas (Visconde de Taunay)', '#4ade80', 22, 8.2, 'rgba(15,23,42,0.82)');
  rotRuaEsq.position.set(-5.8, 0.9, -2.5);
  grupoEntorno.add(rotRuaEsq);

  // Muros de divisa (Muro Esquerdo x=-2,00 = plantas; Muro Direito x=+3,45 = divisa vizinha Machado de Assis)
  caixa(grupoEntorno, 0.16, 2.4, 31.0, -2.0, 1.2, -3.05, 0xb8afa3, { occluder: true });
  caixa(grupoEntorno, 0.16, 2.4, 31.0, 3.45, 1.2, -3.05, 0xa89f93, { occluder: true });
  caixa(grupoEntorno, 5.5, 2.6, 0.18, 0.72, 1.3, -18.55, 0xa89f93, { occluder: true });
  // Portão da garagem (esquerda) + mureta/grade frente ao canteiro (direita)
  caixa(grupoEntorno, 2.3, 1.85, 0.12, -0.82, 0.92, 12.45, 0x475569, { occluder: true });
  caixa(grupoEntorno, 3.1, 1.35, 0.15, 1.9, 0.68, 12.45, 0x64748b, { occluder: true });

  // Área frontal (z: +7,45 até +12,45 = 5,00 m de recuo):
  // 1) Garagem DESCOBERTA para 1 carro — LADO ESQUERDO (próximo ao muro esquerdo, sentido Visconde de Taunay)
  caixa(grupoEntorno, 2.2, 0.05, 4.9, -0.85, 0.03, 9.95, 0x3b4552, { castShadow: false });
  const carro = new THREE.Group();
  caixa(carro, 1.58, 0.56, 3.7, 0, 0.4, 0, 0x64748b, { transparent: true, opacity: 0.42, castShadow: false });
  caixa(carro, 1.38, 0.46, 1.85, 0, 0.88, -0.15, 0x94a3b8, { transparent: true, opacity: 0.42, castShadow: false });
  carro.position.set(-0.85, 0, 10.1);
  grupoEntorno.add(carro);
  const rotGaragem = etiquetaTexto('Garagem descoberta (1 carro)', '#cbd5e1', 22, 4.2);
  rotGaragem.position.set(-0.85, 1.6, 10.1);
  grupoEntorno.add(rotGaragem);

  // 2) Canteiro 2 × 3 m — LADO DIREITO da garagem, defronte à janela do Escritório (acerola, lavandas, babosas)
  caixa(grupoEntorno, 3.0, 0.18, 2.0, 1.75, 0.09, 10.6, 0x5c3424, { castShadow: false });
  const acerola = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 14, 14),
    new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.9 })
  );
  acerola.position.set(2.55, 0.85, 10.9);
  acerola.castShadow = true;
  grupoEntorno.add(acerola);
  caixa(grupoEntorno, 0.6, 0.32, 0.42, 0.85, 0.34, 11.0, 0x8b5cf6, { castShadow: false }); // lavandas
  caixa(grupoEntorno, 0.55, 0.28, 0.42, 1.55, 0.32, 11.05, 0x10b981, { castShadow: false }); // babosas

  // ---------- Telhado da casa (cobre a casa + alpendre; deixa o CORREDOR EXTERNO descoberto!) ----------
  const grupoTelhado = new THREE.Group();
  lote.add(grupoTelhado);
  const telhadoOccluders = [];
  const materialTelha = new THREE.MeshStandardMaterial({ color: 0x8c4a32, roughness: 0.85 });

  // 1) Telhado do corpo principal da casa (x = -0,30 até +3,45 | z = -11,85 até +7,55)
  for (const lado of [-1, 1]) {
    const agua = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.14, 19.5), materialTelha);
    agua.position.set(lado < 0 ? 0.62 : 2.52, 3.32, -2.15);
    agua.rotation.z = lado < 0 ? 0.22 : -0.22;
    agua.castShadow = true;
    agua.receiveShadow = true;
    agua.userData.sempreOccluder = true;
    grupoTelhado.add(agua);
    telhadoOccluders.push(agua);
  }
  // 2) Telhado do Alpendre Coberto (x = -1,95 até +0,30 | z = +2,25 até +7,55) — recuo coberto atrás da garagem!
  const telhaAlpendre = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.12, 5.3), materialTelha);
  telhaAlpendre.position.set(-0.82, 3.05, 4.9);
  telhaAlpendre.rotation.z = 0.14; // queda suave do escritório para o lado esquerdo
  telhaAlpendre.castShadow = true;
  telhaAlpendre.receiveShadow = true;
  telhaAlpendre.userData.sempreOccluder = true;
  grupoTelhado.add(telhaAlpendre);
  telhadoOccluders.push(telhaAlpendre);

  // ---------- Cobertura OPCIONAL dos fundos (DESLIGADA por padrão!) ----------
  // Apoiada no muro DIREITO (+X, divisa Machado de Assis), com QUEDA do telhado sentido ESQUERDO (-X, Visconde de Taunay)
  const grupoCoberturaFundos = new THREE.Group();
  lote.add(grupoCoberturaFundos);
  // Pilares internos no lado da queda (dentro do terreno!)
  [
    [-0.15, -12.6],
    [-0.15, -15.4],
    [-0.15, -18.1],
  ].forEach(([px, pz]) => caixa(grupoCoberturaFundos, 0.12, 2.7, 0.12, px, 1.35, pz, 0x334155));
  // Calha na borda esquerda da queda (sentido Visconde de Taunay)
  caixa(grupoCoberturaFundos, 0.14, 0.12, 5.8, -0.32, 2.66, -15.35, 0x64748b);

  const materialTelhaFundos = new THREE.MeshStandardMaterial({ color: 0xdbeafe, roughness: 0.48, metalness: 0.25 });
  const telhaFundos = new THREE.Mesh(new THREE.BoxGeometry(3.85, 0.08, 5.8), materialTelhaFundos);
  telhaFundos.position.set(1.55, 2.96, -15.35);
  telhaFundos.rotation.z = 0.14; // mais alto no muro direito (+X Machado de Assis), caindo p/ esquerda (-X Visconde de Taunay)!
  telhaFundos.castShadow = true;
  telhaFundos.receiveShadow = true;
  grupoCoberturaFundos.add(telhaFundos);
  occludersLote.push(telhaFundos);

  const materialTranslucida = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    roughness: 0.2,
    transparent: true,
    opacity: 0.42,
  });
  const telhaTranslucida = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 5.8), materialTranslucida);
  telhaTranslucida.position.set(-0.85, 2.62, -15.35);
  telhaTranslucida.rotation.z = 0.14;
  grupoCoberturaFundos.add(telhaTranslucida);

  // ---------- Casa (paredes, portas, janelas, pisos e móveis) ----------
  let casa3d = construirCasa(obterCasa());
  lote.add(casa3d.raiz);

  // ---------- Módulos do ecossistema ----------
  const gruposModulos = {};
  const selecionaveis = [];
  const aneis = {};

  function criarModulo(id) {
    const g = new THREE.Group();
    g.userData.moduloId = id;
    const cor = new THREE.Color(MODULOS[id].cor);
    const add = (w, h, d, x, y, z, mat, extra = {}) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      m.castShadow = extra.castShadow ?? true;
      m.receiveShadow = true;
      g.add(m);
      return m;
    };
    const corSolida = (hex) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.75, metalness: 0.08 });

    if (id === 'estacao_mesh') {
      add(0.08, 2.2, 0.08, 0, 1.1, 0, corSolida(0xcbd5e1));
      const painel = add(0.55, 0.04, 0.45, 0, 1.25, -0.15, corSolida(0x1d4ed8));
      painel.rotation.x = -0.38;
      add(0.32, 0.24, 0.18, 0, 0.7, 0.15, corSolida(0xf8fafc));
      add(0.04, 0.65, 0.04, 0, 2.35, 0, corSolida(0x38bdf8));
      add(0.5, 0.05, 0.05, 0, 1.85, 0, corSolida(0xf8fafc));
    } else if (id === 'horta_15m') {
      add(0.45, 0.45, 4.4, 0, 0.65, 4.8, corSolida(0x92400e));
      add(0.4, 0.28, 4.2, 0, 1.0, 4.8, corSolida(0xa3e635));
      add(0.45, 0.45, 5.2, 0, 0.65, 0, corSolida(0x78350f));
      add(0.4, 0.34, 5.0, 0, 1.02, 0, corSolida(0x22c55e));
      [-3.4, -4.4, -5.4, -6.4].forEach((zv) => {
        add(0.45, 0.42, 0.65, 0, 0.24, zv, corSolida(0x0369a1));
        add(0.38, 0.35, 0.58, 0, 0.6, zv, corSolida(0x10b981));
      });
      add(0.05, 0.05, 14.4, 0.22, 0.9, 0.2, corSolida(0x38bdf8));
    } else if (id === 'pergolado_frente') {
      [
        [-1.1, -0.75],
        [1.1, -0.75],
        [-1.1, 0.75],
        [1.1, 0.75],
      ].forEach(([px, pz]) => add(0.1, 2.2, 0.1, px, 1.1, pz, corSolida(0x7c2d12)));
      for (let z = -0.75; z <= 0.75; z += 0.3) add(2.3, 0.07, 0.07, 0, 2.22, z, corSolida(0x9a3412));
      add(2.1, 0.14, 1.35, 0, 2.32, 0, corSolida(0x15803d), { castShadow: false });
    } else if (id === 'galinheiro') {
      add(3.2, 1.9, 1.8, 0, 0.95, 0, corSolida(0xfef08a), { castShadow: false });
      add(3.2, 0.1, 1.8, 0, 0.05, 0, corSolida(0xd6b88d), { castShadow: false });
      add(1.2, 1.0, 1.5, 0.95, 1.25, 0, corSolida(0xb45309));
      const telha = add(1.45, 0.08, 1.75, 0.95, 1.85, 0, corSolida(0xe2e8f0));
      telha.rotation.z = 0.14;
      add(0.35, 0.4, 0.65, 1.65, 1.0, 0, corSolida(0x92400e));
    } else if (id === 'tenebrios') {
      for (let i = 0; i < 5; i++) add(0.45, 0.14, 0.35, 0, 0.18 + i * 0.22, 0, corSolida(0xd97706));
    } else if (id === 'algas_azolla') {
      add(1.2, 0.75, 0.65, 0, 0.38, 0, corSolida(0x475569));
      [-0.38, -0.14].forEach((cx) => {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.48, 14), corSolida(0x059669));
        m.position.set(cx, 1.0, 0);
        m.castShadow = true;
        g.add(m);
      });
      add(0.58, 0.22, 0.52, 0.26, 0.87, 0, corSolida(0x10b981));
    } else if (id === 'tanque_peixes') {
      const tanque = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.58, 0.85, 22), corSolida(0x0284c7));
      tanque.position.set(0, 0.43, 0);
      tanque.castShadow = true;
      g.add(tanque);
      const agua = new THREE.Mesh(
        new THREE.CylinderGeometry(0.61, 0.61, 0.04, 22),
        new THREE.MeshStandardMaterial({ color: 0x22d3ee, roughness: 0.15, metalness: 0.3 })
      );
      agua.position.set(0, 0.84, 0);
      g.add(agua);
      const filtro = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.8, 16), corSolida(0x1e3a8a));
      filtro.position.set(0.85, 0.4, -0.2);
      filtro.castShadow = true;
      g.add(filtro);
    } else if (id === 'composteira') {
      [-0.4, 0, 0.4].forEach((cx) => add(0.36, 0.65, 0.48, cx, 0.33, 0, corSolida(0x65a30d)));
    } else if (id === 'churrasco') {
      add(1.8, 0.9, 0.65, 0, 0.45, 0, corSolida(0x64748b));
      add(0.85, 2.35, 0.72, 0.95, 1.18, 0, corSolida(0x991b1b));
      add(0.4, 0.9, 0.4, 0.95, 2.6, 0, corSolida(0x7f1d1d));
    } else if (id === 'oficina') {
      add(1.65, 0.88, 0.68, 0, 0.44, 0, corSolida(0x9a3412));
      add(1.7, 0.08, 0.72, 0, 0.9, 0, corSolida(0xf97316));
      add(1.5, 0.85, 0.06, 0, 1.5, -0.32, corSolida(0x334155));
    } else if (id === 'emergencia_72h') {
      add(0.85, 1.75, 0.52, 0, 0.92, 0, corSolida(0x334155));
      add(0.87, 0.25, 0.54, 0, 1.68, 0, corSolida(0xef4444));
      add(0.26, 0.36, 0.26, -0.22, 0.25, 0.34, corSolida(0x38bdf8));
      add(0.26, 0.36, 0.26, 0.16, 0.25, 0.34, corSolida(0x22c55e));
    } else {
      add(1, 1, 1, 0, 0.5, 0, corSolida(cor.getHex()));
    }

    const anel = new THREE.Mesh(
      new THREE.RingGeometry(0.85, 1.0, 28),
      new THREE.MeshBasicMaterial({ color: cor, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
    );
    anel.rotation.x = -Math.PI / 2;
    anel.position.y = 0.05;
    anel.name = 'anelSelecao';
    anel.visible = false;
    g.add(anel);
    aneis[id] = anel;

    g.traverse((obj) => {
      if (obj.isMesh) {
        obj.userData.moduloId = id;
        selecionaveis.push(obj);
      }
    });

    lote.add(g);
    return g;
  }

  for (const id of Object.keys(MODULOS)) gruposModulos[id] = criarModulo(id);

  // ---------- Importação de scan 3D ----------
  const grupoScan = new THREE.Group();
  lote.add(grupoScan);
  let scanRaiz = null;
  const gltfLoader = new GLTFLoader();
  const objLoader = new OBJLoader();
  const plyLoader = new PLYLoader();

  function carregarScan(arquivo) {
    return new Promise((resolve, reject) => {
      const ext = arquivo.name.split('.').pop().toLowerCase();
      const url = URL.createObjectURL(arquivo);
      const finalizar = (obj, dimensoes) => {
        if (scanRaiz) grupoScan.remove(scanRaiz);
        const caixa3 = new THREE.Box3().setFromObject(obj);
        const centro = caixa3.getCenter(new THREE.Vector3());
        const tamanho = caixa3.getSize(new THREE.Vector3());
        obj.position.set(-centro.x, -caixa3.min.y, -centro.z);
        obj.traverse((filho) => {
          if (filho.isMesh) {
            filho.castShadow = true;
            filho.receiveShadow = true;
          }
        });
        const envelope = new THREE.Group();
        envelope.add(obj);
        scanRaiz = envelope;
        grupoScan.add(envelope);
        const maior = Math.max(tamanho.x, tamanho.y, tamanho.z) || 1;
        let escala = 1;
        if (maior > 40) escala = +(12 / maior).toFixed(3);
        else if (maior < 0.8) escala = +(4 / maior).toFixed(2);
        URL.revokeObjectURL(url);
        resolve({ nome: arquivo.name, escalaSugerida: escala, dimensoes: dimensoes || tamanho });
      };

      if (ext === 'glb' || ext === 'gltf') {
        gltfLoader.load(url, (gltf) => finalizar(gltf.scene), undefined, () => reject(new Error('GLB/GLTF inválido')));
      } else if (ext === 'obj') {
        objLoader.load(url, (obj) => finalizar(obj), undefined, () => reject(new Error('OBJ inválido')));
      } else if (ext === 'ply') {
        plyLoader.load(
          url,
          (geometria) => {
            geometria.computeVertexNormals();
            const temCor = Boolean(geometria.attributes.color);
            const material = new THREE.MeshStandardMaterial({
              vertexColors: temCor,
              color: temCor ? 0xffffff : 0x94a3b8,
            });
            const obj = new THREE.Mesh(geometria, material);
            finalizar(obj, 'nuvem de pontos');
          },
          undefined,
          () => reject(new Error('PLY inválido'))
        );
      } else {
        reject(new Error('Use .glb, .gltf, .obj ou .ply'));
      }
    });
  }

  function aplicarTransformacaoScan({ escala = 1, x = 0, y = 0, z = 0, rot = 0 } = {}) {
    if (!scanRaiz) return;
    scanRaiz.scale.setScalar(escala);
    scanRaiz.position.set(x, y, z);
    scanRaiz.rotation.y = THREE.MathUtils.degToRad(rot);
  }

  function removerScan() {
    if (scanRaiz) {
      grupoScan.remove(scanRaiz);
      scanRaiz = null;
      return true;
    }
    return false;
  }

  // ---------- Conversões lote ↔ mundo ----------
  lote.updateMatrixWorld(true);
  function localParaMundo(x, y, z) {
    return new THREE.Vector3(x, y, z).applyMatrix4(lote.matrixWorld);
  }
  function mundoParaLocal(vetor) {
    return vetor.clone().applyMatrix4(new THREE.Matrix4().copy(lote.matrixWorld).invert());
  }

  // ---------- Sol e diagnóstico ----------
  const raycaster = new THREE.Raycaster();
  let curvaAtual = null;

  function visivelNaCena(obj) {
    let p = obj;
    while (p) {
      if (!p.visible) return false;
      p = p.parent;
    }
    return true;
  }

  function horasDeSol(pontoMundo, curva, occluders) {
    if (!curva || !occluders.length) return { horas: 0, horasTarde: 0 };
    let diretos = 0;
    let tarde = 0;
    for (let i = 0; i < curva.points.length; i += 2) {
      const p = curva.points[i];
      if (p.altitudeDeg < 4) continue;
      const v = sunToVector3(p.azimuthRad, p.altitudeRad, 1);
      const dir = new THREE.Vector3(v.x, v.y, v.z).normalize();
      raycaster.set(pontoMundo, dir);
      if (raycaster.intersectObjects(occluders, false).length === 0) {
        diretos++;
        if (p.hour >= 13) tarde++;
      }
    }
    return { horas: +((diretos * 20) / 60).toFixed(1), horasTarde: +((tarde * 20) / 60).toFixed(1) };
  }

  function occludersVisiveis() {
    const lista = occludersLote.filter((o) => visivelNaCena(o));
    if (grupoTelhado.visible) lista.push(...telhadoOccluders);
    casa3d.occluders.forEach((o) => {
      if (visivelNaCena(o)) lista.push(o);
    });
    return lista;
  }

  function diagnosticarModulo(id) {
    const cfg = MODULOS[id];
    const grupo = gruposModulos[id];
    if (!cfg || !grupo) return null;
    lote.updateMatrixWorld(true);
    const ponto = new THREE.Vector3();
    grupo.getWorldPosition(ponto);
    ponto.y += 1.05;
    const stats = horasDeSol(ponto, curvaAtual, occludersVisiveis());
    let alerta = '';
    if (cfg.regra?.tipo === 'maxSol' && stats.horas > cfg.regra.valor) alerta = cfg.regra.aviso;
    else if (cfg.regra?.tipo === 'maxSolTarde' && stats.horasTarde > cfg.regra.valor) alerta = cfg.regra.aviso;
    else if (cfg.regra?.tipo === 'minSol' && stats.horas < cfg.regra.valor) alerta = cfg.regra.aviso;
    return { ...stats, alerta, dica: cfg.dica };
  }

  /**
   * Sol dentro do cômodo: conta como "sol" quando a luz entra e bate no piso.
   * Amostra uma grade 3×3 no piso e considera o horário ensolarado se pelo
   * menos um ponto recebe sol direto — é a leitura que combina com a sensação
   * de "este quarto pega sol".
   */
  function diagnosticarComodo(room) {
    if (!room) return null;
    lote.updateMatrixWorld(true);
    const pontos = [];
    for (const fx of [0.25, 0.5, 0.75]) {
      for (const fz of [0.25, 0.5, 0.75]) {
        pontos.push(localParaMundo(room.x + room.w * fx, 0.35, room.z + room.d * fz));
      }
    }
    const occluders = [...telhadoOccluders, ...casa3d.occluders];
    if (!curvaAtual || !occluders.length) return { horas: 0, horasTarde: 0 };
    let diretos = 0;
    let tarde = 0;
    for (let i = 0; i < curvaAtual.points.length; i += 2) {
      const p = curvaAtual.points[i];
      if (p.altitudeDeg < 4) continue;
      const v = sunToVector3(p.azimuthRad, p.altitudeRad, 1);
      const dir = new THREE.Vector3(v.x, v.y, v.z).normalize();
      const ensolarado = pontos.some((ponto) => {
        raycaster.set(ponto, dir);
        return raycaster.intersectObjects(occluders, false).length === 0;
      });
      if (ensolarado) {
        diretos++;
        if (p.hour >= 13) tarde++;
      }
    }
    return { horas: +((diretos * 20) / 60).toFixed(1), horasTarde: +((tarde * 20) / 60).toFixed(1) };
  }

  // ---------- Câmera ----------
  const alvoAtual = new THREE.Vector3();
  let animandoCamera = false;

  function irPara(posicao, alvo) {
    camera.position.copy(posicao);
    controls.target.copy(alvo);
    controls.update();
    alvoAtual.copy(alvo);
  }

  function aplicarPreset(nome) {
    const p = PRESETS[nome];
    if (!p) return;
    lote.updateMatrixWorld(true);
    const alvo = localParaMundo(p.alvo[0], p.alvo[1], p.alvo[2]);
    const pos = localParaMundo(p.pos[0], p.pos[1], p.pos[2]);
    irPara(pos, alvo);
  }

  function focarComodo(id) {
    const centro = casa3d.centroDoComodo(id);
    if (!centro) return;
    const room = obterCasa().rooms.find((r) => r.id === id);
    const alvo = localParaMundo(centro.x, 1.0, centro.z);
    const escala = room ? Math.max(room.w, room.d) : 3;
    const desloc = new THREE.Vector3(2.0 + escala * 0.55, 4.2 + escala * 0.9, 2.2 + escala * 0.6);
    desloc.applyAxisAngle(new THREE.Vector3(0, 1, 0), lote.rotation.y);
    irPara(alvo.clone().add(desloc), alvo);
  }

  /** Câmera cinematográfica na altura dos olhos (1,55 m) em um canto do cômodo. */
  function focarDentroComodo(id) {
    const room = obterCasa().rooms.find((r) => r.id === id);
    if (!room) return;
    lote.updateMatrixWorld(true);
    const olho = localParaMundo(room.x + Math.min(0.45, room.w * 0.2), 1.55, room.z + room.d - Math.min(0.45, room.d * 0.2));
    const alvo = localParaMundo(room.x + room.w * 0.62, 1.15, room.z + room.d * 0.35);
    irPara(olho, alvo);
  }

  function capturarRenderDataUrl() {
    renderer.render(scene, camera);
    return canvas.toDataURL('image/png');
  }

  // ---------- Raycast de clique ----------
  const ponteiro = new THREE.Vector2();
  function normalizarPonteiro(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    ponteiro.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ponteiro.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ponteiro, camera);
  }

  function pickModulo(clientX, clientY) {
    normalizarPonteiro(clientX, clientY);
    const hits = raycaster.intersectObjects(selecionaveis, false);
    return hits.length ? hits[0].object.userData.moduloId || null : null;
  }

  function pickMovel(clientX, clientY) {
    normalizarPonteiro(clientX, clientY);
    const visiveis = casa3d.selecionaveisMoveis.filter((m) => visivelNaCena(m));
    const hits = raycaster.intersectObjects(visiveis, false);
    return hits.length ? hits[0].object.userData.movelId || null : null;
  }

  function pickChao(clientX, clientY) {
    normalizarPonteiro(clientX, clientY);
    const plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const ponto = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(plano, ponto)) return null;
    return mundoParaLocal(ponto);
  }

  canvas.addEventListener('pointerdown', (e) => {
    canvas.dataset.downX = String(e.clientX);
    canvas.dataset.downY = String(e.clientY);
  });
  canvas.addEventListener('pointerup', (e) => {
    const dx = e.clientX - Number(canvas.dataset.downX || 0);
    const dy = e.clientY - Number(canvas.dataset.downY || 0);
    if (Math.hypot(dx, dy) > 6) return;
    const estadoAtual = obterEstado();
    if (estadoAtual.modo === 'passeio') return;
    if (estadoAtual.aba === 'casa3d') {
      const id = pickModulo(e.clientX, e.clientY);
      if (id) aoSelecionarModulo?.(id);
    } else if (estadoAtual.aba === 'moveis' || estadoAtual.aba === 'interiores' || estadoAtual.aba === 'render') {
      const movId = pickMovel(e.clientX, e.clientY);
      if (movId) aoSelecionarMovel?.(movId);
    }
  });

  // ---------- Atualização geral ----------
  let dadosSol = null;
  let destaqueAtual = undefined;

  function atualizarTudo() {
    const estado = obterEstado();
    const casa = obterCasa();
    const emRender = estado.aba === 'render';
    const realista = emRender || Boolean(estado.renderRealista);
    const vistaInterior = estado.aba === 'interiores' || estado.aba === 'moveis' || emRender;
    const isolando = vistaInterior && Boolean(estado.isolarComodo) && Boolean(estado.comodoSelecionado);

    casa3d.definirModoRealista(realista);

    lote.rotation.y = -THREE.MathUtils.degToRad(estado.lotAzimuth ?? AZIMUTE_PADRAO);
    lote.updateMatrixWorld(true);
    planoSatelite.visible = !isolando && estado.satelite !== false;
    grupoEntorno.visible = !isolando;
    rosa.visible = !isolando && !emRender;

    // Telhado e interior (na Casa 3D, quando Raio-X remove o telhado, todos os móveis aparecem!)
    const mostrarInterior = vistaInterior || estado.raioX;
    grupoTelhado.visible = !mostrarInterior;
    casa3d.definirVisibilidade({
      interior: mostrarInterior,
      mobilia: mostrarInterior && (estado.aba === 'moveis' || emRender || estado.mobilia !== false),
      etiquetas: mostrarInterior && !emRender && estado.etiquetas !== false && estado.modo !== 'passeio',
      selecionado: estado.comodoSelecionado,
      isolar: isolando,
      paredes: vistaInterior ? estado.modoParedes || 'inteiras' : 'inteiras',
    });
    const destaque = mostrarInterior && !emRender ? estado.comodoSelecionado : null;
    if (destaque !== destaqueAtual) {
      casa3d.destacar(destaque);
      destaqueAtual = destaque;
    }
    casa3d.destacarMovel(estado.aba === 'moveis' || emRender ? estado.movelSelecionado : null);

    // Cobertura dos fundos (encostada no muro direito Machado de Assis -> queda p/ esquerda Visconde de Taunay)
    if (isolando || estado.coberturaFundos === 'nenhuma') {
      grupoCoberturaFundos.visible = false;
    } else if (estado.coberturaFundos === 'sanduiche') {
      grupoCoberturaFundos.visible = true;
      telhaTranslucida.visible = false;
    } else {
      grupoCoberturaFundos.visible = true;
      telhaTranslucida.visible = true;
    }

    // Módulos
    for (const [id, cfg] of Object.entries(estado.modulos)) {
      const grupo = gruposModulos[id];
      const base = MODULOS[id];
      if (!grupo || !base) continue;
      grupo.visible = !isolando && cfg.visivel !== false;
      grupo.position.set(cfg.x ?? base.x, cfg.y ?? base.y ?? 0, cfg.z ?? base.z);
      grupo.rotation.y = THREE.MathUtils.degToRad(cfg.rot || 0);
      if (aneis[id]) aneis[id].visible = id === estado.moduloSelecionado && mostrarInterior === false;
    }

    // Sol
    const [ano, mes, dia] = (estado.data || '2026-06-21').split('-').map(Number);
    const hora = Number(estado.hora ?? 9.5);
    const dt = makeBRTDate(ano || 2026, mes || 6, dia || 21, hora);
    const pos = getSunPosition(dt, estado.lat, estado.lng);
    const vetor = sunToVector3(pos.azimuthRad, Math.max(pos.altitudeRad, -0.05), 36);
    sol.position.set(vetor.x, vetor.y, vetor.z);
    esferaSol.position.set(vetor.x * 0.94, vetor.y * 0.94, vetor.z * 0.94);
    const diaClaro = pos.altitudeDeg > 0;
    const luzRender = estado.luzRender || 'dia';
    const centroLuz = casa3d.centroDoComodo(estado.comodoSelecionado);
    if (centroLuz) {
      luzInterna.position.copy(localParaMundo(centroLuz.x, 2.45, centroLuz.z));
    }

    if (realista) {
      if (luzRender === 'noite') {
        scene.background.setHex(0x0c1726);
        scene.fog.color.setHex(0x0c1726);
        sol.intensity = 0.12;
        esferaSol.visible = false;
        hemi.intensity = 0.42;
        luzInterna.color.setHex(0xffd79e);
        luzInterna.intensity = 10.5;
        renderer.toneMappingExposure = 1.18;
      } else if (luzRender === 'tarde') {
        scene.background.setHex(0x4a3444);
        scene.fog.color.setHex(0x4a3444);
        sol.color.setHex(0xffb56b);
        sol.intensity = 2.4;
        esferaSol.visible = diaClaro;
        hemi.intensity = 0.72;
        luzInterna.color.setHex(0xffe0b2);
        luzInterna.intensity = 4.5;
        renderer.toneMappingExposure = 1.15;
      } else {
        scene.background.setHex(0x5289b8);
        scene.fog.color.setHex(0x5289b8);
        sol.color.setHex(0xfffaf0);
        sol.intensity = diaClaro ? 2.65 : 1.1;
        esferaSol.visible = diaClaro;
        hemi.intensity = 0.95;
        luzInterna.color.setHex(0xfff4e0);
        luzInterna.intensity = 2.2;
        renderer.toneMappingExposure = 1.14;
      }
    } else {
      luzInterna.intensity = 0;
      renderer.toneMappingExposure = 1.05;
      sol.intensity = diaClaro ? Math.min(2.6, 0.7 + Math.sin(pos.altitudeRad) * 2.2) : 0.05;
      esferaSol.visible = diaClaro;
      hemi.intensity = diaClaro ? 0.58 : 0.16;
      if (!diaClaro) {
        scene.background.setHex(0x060b14);
        scene.fog.color.setHex(0x060b14);
      } else if (pos.altitudeDeg < 14) {
        scene.background.setHex(0x1f1b2e);
        scene.fog.color.setHex(0x1f1b2e);
        sol.color.setHex(0xffb36b);
      } else {
        scene.background.setHex(0x0e1d30);
        scene.fog.color.setHex(0x0e1d30);
        sol.color.setHex(0xfff6e0);
      }
    }

    curvaAtual = getDaySolarCurve(ano || 2026, mes || 6, dia || 21, estado.lat, estado.lng);
    if (arcoSolar) {
      scene.remove(arcoSolar);
      arcoSolar.geometry.dispose();
      arcoSolar.material.dispose();
      arcoSolar = null;
    }
    const pontosArco = curvaAtual.points
      .filter((p) => p.altitudeDeg >= 0)
      .map((p) => {
        const v = sunToVector3(p.azimuthRad, p.altitudeRad, 32);
        return new THREE.Vector3(v.x, v.y, v.z);
      });
    if (pontosArco.length > 1) {
      arcoSolar = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pontosArco),
        new THREE.LineBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.65 })
      );
      scene.add(arcoSolar);
    }

    dadosSol = {
      horaFormatada: formatHour(hora),
      azimute: `${pos.azimuthDeg.toFixed(1)}° (${compassLabel(pos.azimuthDeg)})`,
      elevacao: `${pos.altitudeDeg.toFixed(1)}°`,
      nascer: formatHour(curvaAtual.sunrise),
      por: formatHour(curvaAtual.sunset),
      horasDeLuz: curvaAtual.daylightHours,
      noite: !diaClaro,
    };
    aoAtualizarSol?.(dadosSol);
  }

  function definirCasa(novaCasa) {
    casa3d.reconstruir(novaCasa);
    destaqueAtual = undefined;
    lote.updateMatrixWorld(true);
  }

  function atualizarMoveis(novaCasa) {
    casa3d.reconstruirMoveis(novaCasa);
    lote.updateMatrixWorld(true);
  }

  // ---------- Loop / resize ----------
  let rodando = false;
  function resize() {
    const wrap = canvas.parentElement;
    const w = Math.max(200, wrap.clientWidth || 800);
    const h = Math.max(200, wrap.clientHeight || 500);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function iniciarLoop(aoFrame) {
    if (rodando) return;
    rodando = true;
    let anterior = 0;
    const passo = (ts) => {
      requestAnimationFrame(passo);
      const dt = Math.min((ts - anterior) / 1000, 0.1);
      anterior = ts;
      aoFrame?.(dt);
      if (controls.enabled) controls.update();
      renderer.render(scene, camera);
    };
    requestAnimationFrame(passo);
  }

  atualizarTudo();
  aplicarPreset('geral');

  return {
    three: { scene, camera, controls, renderer },
    renderer,
    camera,
    controls,
    lote,
    casa3d,
    atualizarTudo,
    definirCasa,
    atualizarMoveis,
    diagnosticarModulo,
    diagnosticarComodo,
    aplicarPreset,
    focarComodo,
    focarDentroComodo,
    capturarRenderDataUrl,
    localParaMundo,
    mundoParaLocal,
    pickModulo,
    pickChao,
    carregarScan,
    aplicarTransformacaoScan,
    removerScan,
    resize,
    iniciarLoop,
    get dadosSol() {
      return dadosSol;
    },
    get curva() {
      return curvaAtual;
    },
    get temScan() {
      return Boolean(scanRaiz);
    },
  };
}
