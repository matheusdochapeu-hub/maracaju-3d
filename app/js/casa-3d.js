/**
 * casa-3d.js — Constrói a casa em Three.js a partir do modelo (casa-modelo.js).
 *
 * Nada de medidas fixas aqui: paredes, portas, janelas, pisos e móveis vêm
 * todos de `casa`. Se o usuário arrasta uma parede na planta, a casa 3D é
 * reconstruída com as novas medidas.
 */

import * as THREE from 'three';
import { aberturasVisiveis, areaComodo, PISOS, redeDeParedes } from './casa-modelo.js';

const MAT = {
  externa: new THREE.MeshStandardMaterial({ color: 0xe2ddd5, roughness: 0.86, metalness: 0.02 }),
  interna: new THREE.MeshStandardMaterial({ color: 0xf3f0ea, roughness: 0.92, metalness: 0 }),
  verga: new THREE.MeshStandardMaterial({ color: 0xded8cf, roughness: 0.9, metalness: 0 }),
  batente: new THREE.MeshStandardMaterial({ color: 0x7c5a3a, roughness: 0.7, metalness: 0.05 }),
  esquadria: new THREE.MeshStandardMaterial({ color: 0xb4bcc5, roughness: 0.45, metalness: 0.35 }),
  vidro: new THREE.MeshStandardMaterial({
    color: 0x9fd8f2,
    roughness: 0.08,
    metalness: 0.1,
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
  mover: new THREE.MeshStandardMaterial({ color: 0x5b6b7c, roughness: 0.75, metalness: 0.05 }),
  madeira: new THREE.MeshStandardMaterial({ color: 0x8a5a3b, roughness: 0.8, metalness: 0 }),
  bancada: new THREE.MeshStandardMaterial({ color: 0xc9cdd2, roughness: 0.35, metalness: 0.15 }),
  louca: new THREE.MeshStandardMaterial({ color: 0xf2f5f8, roughness: 0.25, metalness: 0.05 }),
  eletro: new THREE.MeshStandardMaterial({ color: 0xdfe5ea, roughness: 0.4, metalness: 0.3 }),
};

function caixa(grupo, w, h, d, x, y, z, material, castShadow = true) {
  const malha = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  malha.position.set(x, y, z);
  malha.castShadow = castShadow;
  malha.receiveShadow = true;
  grupo.add(malha);
  return malha;
}

function limparGrupo(grupo) {
  grupo.traverse((obj) => {
    if (obj.isMesh || obj.isLine || obj.isSprite) {
      obj.geometry?.dispose?.();
      if (obj.material && obj.material.userData?.proprio) {
        obj.material.map?.dispose?.();
        obj.material.dispose?.();
      }
    }
  });
  grupo.clear();
}

function criarEtiqueta(nome, areaTxt, cor) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 170;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(8, 14, 21, 0.82)';
  ctx.strokeStyle = cor;
  ctx.lineWidth = 4;
  const raio = 28;
  ctx.beginPath();
  ctx.roundRect?.(4, 4, 504, 162, raio);
  if (!ctx.roundRect) ctx.rect(4, 4, 504, 162);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 54px Segoe UI, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(nome, 256, 68);
  ctx.fillStyle = cor;
  ctx.font = '600 36px Segoe UI, system-ui, sans-serif';
  ctx.fillText(areaTxt, 256, 124);
  const textura = new THREE.CanvasTexture(canvas);
  textura.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: textura, transparent: true, depthTest: false });
  material.userData.proprio = true;
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2.7, 0.9, 1);
  sprite.renderOrder = 10;
  return sprite;
}

/**
 * Móveis de referência. São propositalmente simples: servem para reconhecer
 * o cômodo e discutir layout, não para detalhar marcenaria.
 * Coordenadas relativas ao canto (x, z) do cômodo.
 */
function moveisDoComodo(room, grupoMobilia) {
  const { x, z, w, d, tipo } = room;
  const mx = (fx) => x + fx;
  const mz = (fz) => z + fz;
  const add = (bw, bh, bd, fx, fy, fz, mat) => caixa(grupoMobilia, bw, bh, bd, mx(fx), fy, mz(fz), mat);

  if (tipo === 'sala') {
    add(0.85, 0.75, Math.min(2.0, d - 1.2), 0.55, 0.38, d * 0.45, MAT.mover); // sofá
    add(0.55, 0.36, 0.55, 1.75, 0.18, d * 0.45, MAT.madeira); // mesa de centro
    add(0.35, 0.5, 1.1, w - 0.25, 0.25, d * 0.78, MAT.madeira); // rack da TV
    add(0.06, 0.62, 1.0, w - 0.08, 1.15, d * 0.78, MAT.eletro); // TV
  } else if (tipo === 'quarto') {
    add(1.4, 0.45, 1.9, 0.85, 0.24, 1.1, MAT.mover); // cama
    add(1.4, 0.08, 1.9, 0.85, 0.5, 1.1, MAT.louca); // colchão
    add(1.4, 0.7, 0.08, 0.85, 0.35, 0.15, MAT.madeira); // cabeceira
    add(0.45, 0.45, 0.4, 1.75, 0.22, 0.35, MAT.madeira); // criado-mudo
    add(0.55, 2.1, 1.3, w - 0.32, 1.05, d - 1.0, MAT.madeira); // guarda-roupa
  } else if (tipo === 'banheiro') {
    add(0.9, 0.06, 0.9, 0.5, 0.05, 0.5, MAT.louca); // base do box
    add(0.04, 1.9, 0.9, 0.96, 0.95, 0.5, MAT.vidro); // vidro do box
    add(0.4, 0.42, 0.62, 0.35, 0.21, d - 0.45, MAT.louca); // vaso
    add(0.7, 0.12, 0.45, w - 0.45, 0.82, 0.35, MAT.bancada); // bancada da pia
    add(0.3, 0.7, 0.3, w - 0.45, 0.38, 0.35, MAT.louca); // coluna da pia
  } else if (tipo === 'cozinha') {
    add(Math.min(2.4, w - 0.4), 0.9, 0.6, Math.min(2.4, w - 0.4) / 2 + 0.1, 0.45, 0.35, MAT.bancada); // bancada
    add(0.6, 0.06, 0.5, 0.9, 0.94, 0.35, MAT.eletro); // fogão
    add(0.65, 1.8, 0.7, w - 0.45, 0.9, 1.25, MAT.eletro); // geladeira
  }
}

export function construirCasa(casa) {
  let modeloAtual = casa;
  const raiz = new THREE.Group();
  raiz.name = 'casaMaracaju';
  const grupoExterior = new THREE.Group();
  const grupoInterior = new THREE.Group();
  const grupoMobilia = new THREE.Group();
  const grupoEtiquetas = new THREE.Group();
  const grupoDestaque = new THREE.Group();
  raiz.add(grupoExterior, grupoInterior, grupoMobilia, grupoEtiquetas, grupoDestaque);

  /** Lista de paredes para colisão do passeio (AABB no plano XZ). */
  let colisores = [];
  let occluders = [];
  let centroDosComodos = {};

  function reconstruir(modelo) {
    modeloAtual = modelo;
    limparGrupo(grupoExterior);
    limparGrupo(grupoInterior);
    limparGrupo(grupoMobilia);
    limparGrupo(grupoEtiquetas);
    limparGrupo(grupoDestaque);
    colisores = [];
    occluders = [];
    centroDosComodos = {};

    const env = modelo.envelope;

    // ---- Pisos por cômodo ----
    for (const room of modelo.rooms) {
      const piso = PISOS[room.piso] || PISOS.nao_definido;
      const materialPiso = new THREE.MeshStandardMaterial({
        color: piso.cor,
        roughness: piso.aspereza,
        metalness: 0.02,
      });
      materialPiso.userData.proprio = true;
      const malha = caixa(grupoInterior, room.w, 0.04, room.d, room.x + room.w / 2, 0.02, room.z + room.d / 2, materialPiso, false);
      malha.receiveShadow = true;
      centroDosComodos[room.id] = { x: room.x + room.w / 2, z: room.z + room.d / 2 };
    }

    // ---- Paredes, portas e janelas ----
    const blocos = redeDeParedes(modelo);
    for (const b of blocos) {
      const comprimento = b.fim - b.ini;
      const altura = b.yTopo - b.yBase;
      if (comprimento <= 0.02 || altura <= 0.02) continue;
      const material = b.externa ? MAT.externa : b.tipo === 'parede' ? MAT.interna : MAT.verga;
      const destino = b.externa ? grupoExterior : grupoInterior;
      let malha;
      if (b.eixo === 'h') {
        malha = caixa(destino, comprimento, altura, b.espessura, (b.ini + b.fim) / 2, (b.yBase + b.yTopo) / 2, b.coord, material);
        if (b.yBase < 1.6 && b.yTopo > 0.25) {
          colisores.push({ x0: b.ini, x1: b.fim, z0: b.coord - b.espessura / 2, z1: b.coord + b.espessura / 2 });
        }
      } else {
        malha = caixa(destino, b.espessura, altura, comprimento, b.coord, (b.yBase + b.yTopo) / 2, (b.ini + b.fim) / 2, material);
        if (b.yBase < 1.6 && b.yTopo > 0.25) {
          colisores.push({ x0: b.coord - b.espessura / 2, x1: b.coord + b.espessura / 2, z0: b.ini, z1: b.fim });
        }
      }
      occluders.push(malha);
    }

    // ---- Batentes, esquadrias e vidros ----
    for (const a of aberturasVisiveis(modelo)) {
      const hHorizontal = a.eixo === 'h';
      const esp = env.espExterna;
      const barra = a.tipo === 'porta' ? MAT.batente : MAT.esquadria;
      const larg = a.largura;
      const alt = a.altura;
      const peitoril = a.peitoril;
      const yCentro = peitoril + alt / 2;
      const criarBarra = (bw, bh, bd, dx, dy, dz) => {
        if (hHorizontal) caixa(grupoExterior, bw, bh, bd, a.ini + larg / 2 + dx, dy, a.coord + dz, barra);
        else caixa(grupoExterior, bd, bh, bw, a.coord + dz, dy, a.ini + larg / 2 + dx, barra);
      };
      // montantes laterais
      criarBarra(0.05, alt, esp + 0.04, -larg / 2 + 0.025, yCentro, 0);
      criarBarra(0.05, alt, esp + 0.04, larg / 2 - 0.025, yCentro, 0);
      // travessa superior (e peitoril, no caso de janela)
      criarBarra(larg, 0.05, esp + 0.04, 0, peitoril + alt - 0.025, 0);
      if (a.tipo === 'janela') {
        criarBarra(larg, 0.05, esp + 0.06, 0, peitoril + 0.025, 0);
        const vidro = new THREE.Mesh(
          new THREE.BoxGeometry(hHorizontal ? larg - 0.08 : 0.02, alt - 0.08, hHorizontal ? 0.02 : larg - 0.08),
          MAT.vidro
        );
        vidro.position.set(hHorizontal ? a.ini + larg / 2 : a.coord, yCentro, hHorizontal ? a.coord : a.ini + larg / 2);
        vidro.renderOrder = 2;
        grupoExterior.add(vidro);
      }
    }

    // ---- Móveis e etiquetas ----
    for (const room of modelo.rooms) {
      if (room.mobilia !== false) moveisDoComodo(room, grupoMobilia);
      const etiqueta = criarEtiqueta(room.nome, `${areaComodo(room).toFixed(1).replace('.', ',')} m²`, room.cor);
      etiqueta.position.set(room.x + room.w / 2, env.peDireito + 0.25, room.z + room.d / 2);
      grupoEtiquetas.add(etiqueta);
    }

    raiz.userData.colisores = colisores;
  }

  function destacar(roomId) {
    limparGrupo(grupoDestaque);
    const room = modeloAtual.rooms.find((r) => r.id === roomId);
    if (!room) return;
    const material = new THREE.MeshBasicMaterial({
      color: room.cor,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    });
    material.userData.proprio = true;
    const piso = new THREE.Mesh(new THREE.PlaneGeometry(room.w, room.d), material);
    piso.rotation.x = -Math.PI / 2;
    piso.position.set(room.x + room.w / 2, 0.075, room.z + room.d / 2);
    grupoDestaque.add(piso);

    const pontos = [
      new THREE.Vector3(room.x, 0.085, room.z),
      new THREE.Vector3(room.x + room.w, 0.085, room.z),
      new THREE.Vector3(room.x + room.w, 0.085, room.z + room.d),
      new THREE.Vector3(room.x, 0.085, room.z + room.d),
      new THREE.Vector3(room.x, 0.085, room.z),
    ];
    const linha = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pontos),
      new THREE.LineBasicMaterial({ color: room.cor })
    );
    linha.material.userData.proprio = true;
    grupoDestaque.add(linha);
  }

  function definirVisibilidade({ interior = true, mobilia = true, etiquetas = true } = {}) {
    grupoInterior.visible = interior;
    grupoMobilia.visible = interior && mobilia;
    grupoEtiquetas.visible = interior && etiquetas;
    grupoDestaque.visible = interior;
  }

  reconstruir(casa);

  return {
    raiz,
    reconstruir,
    destacar,
    definirVisibilidade,
    get colisores() {
      return raiz.userData.colisores || [];
    },
    get occluders() {
      return occluders;
    },
    centroDoComodo(id) {
      return centroDosComodos[id] || null;
    },
  };
}
