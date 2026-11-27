/**
 * casa-3d.js — Constrói a casa em Three.js a partir do modelo (casa-modelo.js).
 *
 * Nada de medidas fixas aqui: paredes, portas, janelas, pisos e móveis vêm
 * todos de `casa`. Se o usuário arrasta uma parede na planta, a casa 3D é
 * reconstruída com as novas medidas.
 */

import * as THREE from 'three';
import { aberturasVisiveis, areaComodo, PISOS, poligonoComodo, redeDeParedes } from './casa-modelo.js';

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
  const largura = Math.min(1.8, Math.max(1.0, 0.55 + nome.length * 0.1));
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
  const material = new THREE.SpriteMaterial({ map: textura, transparent: true, depthTest: true });
  material.userData.proprio = true;
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(largura, largura / 3, 1);
  sprite.renderOrder = 10;
  return sprite;
}

/**
 * Constrói um móvel ou eletrodoméstico 3D realista a partir de `movel` em `casa.moveis`.
 * Origem local do grupo fica no centro da base (x=0, y=0, z=0), rotacionado por `movel.rot`.
 */
function criarMovel3D(movel, room) {
  const g = new THREE.Group();
  g.position.set(room.x + movel.x, movel.y || 0, room.z + movel.z);
  g.rotation.y = THREE.MathUtils.degToRad(-(movel.rot || 0));
  g.userData.comodos = [movel.comodoId];
  g.userData.movelId = movel.id;

  const { w, d, h, forma } = movel;
  const matCor = new THREE.MeshStandardMaterial({
    color: movel.cor || '#8a5a3b',
    roughness: forma === 'tv' || forma === 'geladeira' || forma === 'lavadora' || forma === 'fogao' ? 0.35 : 0.72,
    metalness: forma === 'tv' || forma === 'geladeira' || forma === 'fogao' ? 0.28 : 0.05,
  });
  matCor.userData.proprio = true;
  const add = (bw, bh, bd, px, py, pz, mat = matCor, cast = true) => caixa(g, bw, bh, bd, px, py, pz, mat, cast);

  if (forma === 'sofa') {
    const assentoH = h * 0.48;
    const bracoW = Math.min(0.18, w * 0.14);
    const encostoD = Math.min(0.22, d * 0.28);
    add(w, assentoH, d, 0, assentoH / 2, 0);
    add(w, h - assentoH, encostoD, 0, assentoH + (h - assentoH) / 2, -d / 2 + encostoD / 2);
    add(bracoW, h * 0.68, d, -w / 2 + bracoW / 2, (h * 0.68) / 2, 0);
    add(bracoW, h * 0.68, d, w / 2 - bracoW / 2, (h * 0.68) / 2, 0);
  } else if (forma === 'sofa_l') {
    const assentoH = h * 0.48;
    const profBase = Math.min(0.85, d * 0.56);
    const largChaise = Math.min(0.85, w * 0.4);
    add(w, assentoH, profBase, 0, assentoH / 2, -d / 2 + profBase / 2);
    add(largChaise, assentoH, d, -w / 2 + largChaise / 2, assentoH / 2, 0);
    add(w, h - assentoH, 0.2, 0, assentoH + (h - assentoH) / 2, -d / 2 + 0.1);
  } else if (forma === 'poltrona') {
    const assentoH = h * 0.48;
    add(w * 0.85, assentoH, d * 0.88, 0, assentoH / 2, 0.03);
    add(w, h, 0.18, 0, h / 2, -d / 2 + 0.09);
    add(0.14, h * 0.66, d, -w / 2 + 0.07, (h * 0.66) / 2, 0);
    add(0.14, h * 0.66, d, w / 2 - 0.07, (h * 0.66) / 2, 0);
  } else if (forma === 'mesa') {
    const tampoH = Math.min(0.06, h * 0.18);
    const pe = Math.min(0.06, Math.min(w, d) * 0.12);
    add(w, tampoH, d, 0, h - tampoH / 2, 0);
    const peH = Math.max(0.05, h - tampoH);
    const dx = Math.max(0, w / 2 - pe);
    const dz = Math.max(0, d / 2 - pe);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) add(pe, peH, pe, sx * dx, peH / 2, sz * dz);
    }
  } else if (forma === 'cadeira') {
    const assentoY = Math.min(0.46, h * 0.48);
    add(w * 0.88, 0.06, d * 0.85, 0, assentoY, 0);
    add(w * 0.84, h - assentoY, 0.08, 0, assentoY + (h - assentoY) / 2, -d * 0.38);
    const pe = 0.045;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) add(pe, assentoY, pe, sx * (w * 0.36), assentoY / 2, sz * (d * 0.34), MAT.eletro);
    }
  } else if (forma === 'cama') {
    const baseH = h * 0.62;
    add(w, baseH, d, 0, baseH / 2, 0); // estrado
    add(w * 0.96, h * 0.38, d * 0.95, 0, baseH + (h * 0.38) / 2, 0.02, MAT.louca); // colchão
    add(w, Math.max(0.95, h * 1.65), 0.09, 0, Math.max(0.95, h * 1.65) / 2, -d / 2 + 0.045, MAT.madeira); // cabeceira
    // Travesseiros
    add(w * 0.38, 0.11, 0.34, -w * 0.23, h + 0.05, -d / 2 + 0.28, MAT.louca, false);
    add(w * 0.38, 0.11, 0.34, w * 0.23, h + 0.05, -d / 2 + 0.28, MAT.louca, false);
  } else if (forma === 'tv') {
    add(w, h, Math.max(0.04, d), 0, h / 2, 0);
    add(w * 0.35, 0.04, Math.max(0.18, d * 2.2), 0, 0.02, 0, MAT.eletro, false);
  } else if (forma === 'geladeira') {
    add(w, h, d, 0, h / 2, 0);
    // Friso divisor freezer/geladeira
    add(w + 0.01, 0.02, 0.02, 0, h * 0.7, d / 2, MAT.mover, false);
    add(0.03, h * 0.22, 0.03, -w * 0.38, h * 0.84, d / 2 + 0.015, MAT.mover, false);
    add(0.03, h * 0.32, 0.03, -w * 0.38, h * 0.45, d / 2 + 0.015, MAT.mover, false);
  } else if (forma === 'fogao') {
    add(w, h, d, 0, h / 2, 0);
    add(w * 0.94, 0.03, d * 0.94, 0, h + 0.01, 0, MAT.mover, false); // mesa queimadores
    add(w * 0.78, h * 0.45, 0.02, 0, h * 0.42, d / 2 + 0.01, MAT.mover, false); // vidro forno
  } else if (forma === 'lavadora') {
    add(w, h, d, 0, h / 2, 0);
    const visor = new THREE.Mesh(new THREE.CylinderGeometry(Math.min(w, h) * 0.26, Math.min(w, h) * 0.26, 0.04, 18), MAT.mover);
    visor.rotation.x = Math.PI / 2;
    visor.position.set(0, h * 0.48, d / 2 + 0.01);
    g.add(visor);
  } else if (forma === 'bancada') {
    add(w, h - 0.06, d * 0.94, 0, (h - 0.06) / 2, 0, MAT.interna);
    add(w, 0.06, d, 0, h - 0.03, 0);
  } else if (forma === 'box') {
    add(w, 0.07, d, 0, 0.035, 0, MAT.louca, false);
    add(0.04, h, d, w / 2 - 0.02, h / 2, 0, MAT.vidro, false);
  } else if (forma === 'vaso') {
    add(w * 0.82, h * 0.56, d * 0.72, 0, (h * 0.56) / 2, d * 0.12, matCor);
    add(w * 0.92, h, d * 0.28, 0, h / 2, -d * 0.34, matCor);
  } else if (forma === 'pia') {
    add(w, 0.12, d, 0, h - 0.06, 0);
    add(w * 0.84, h - 0.14, d * 0.82, 0, (h - 0.14) / 2, 0, MAT.louca);
  } else if (forma === 'ar_split') {
    add(w, h, d, 0, h / 2, 0);
    add(w * 0.88, 0.03, 0.03, 0, 0.05, d / 2, MAT.mover, false);
  } else if (forma === 'tapete') {
    add(w, Math.max(0.015, h), d, 0, Math.max(0.015, h) / 2, 0, matCor, false);
  } else {
    // rack, armario, bloco
    add(w, h, d, 0, h / 2, 0);
  }

  g.traverse((obj) => {
    if (obj.isMesh) {
      obj.userData.movelId = movel.id;
      obj.userData.comodos = [movel.comodoId];
    }
  });
  return g;
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
  const grupoDestaqueMovel = new THREE.Group();
  raiz.add(grupoExterior, grupoInterior, grupoMobilia, grupoEtiquetas, grupoDestaque, grupoDestaqueMovel);

  /** Lista de paredes para colisão do passeio (AABB no plano XZ). */
  let colisores = [];
  let occluders = [];
  let selecionaveisMoveis = [];
  let centroDosComodos = {};
  let ultimoFiltroVisibilidade = {};

  function comodosDaAbertura(a, rooms) {
    const ids = new Set();
    if (a.comodo) ids.add(a.comodo);
    const tol = 0.22;
    for (const r of rooms) {
      if (a.eixo === 'd') {
        const mx = (a.x1 + a.x2) / 2;
        const mz = (a.z1 + a.z2) / 2;
        if (mx >= r.x - tol && mx <= r.x + r.w + tol && mz >= r.z - tol && mz <= r.z + r.d + tol) ids.add(r.id);
      } else if (a.eixo === 'h') {
        const tocaZ = Math.abs(a.coord - r.z) <= tol || Math.abs(a.coord - (r.z + r.d)) <= tol;
        const sobrepoeX = a.fim > r.x + 0.02 && a.ini < r.x + r.w - 0.02;
        if (tocaZ && sobrepoeX) ids.add(r.id);
      } else {
        const tocaX = Math.abs(a.coord - r.x) <= tol || Math.abs(a.coord - (r.x + r.w)) <= tol;
        const sobrepoeZ = a.fim > r.z + 0.02 && a.ini < r.z + r.d - 0.02;
        if (tocaX && sobrepoeZ) ids.add(r.id);
      }
    }
    return [...ids];
  }

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
      const poly = poligonoComodo(room);
      let malha;
      if (poly.length > 4) {
        const shape = new THREE.Shape();
        poly.forEach(([px, pz], idx) => {
          if (idx === 0) shape.moveTo(px, -pz);
          else shape.lineTo(px, -pz);
        });
        shape.closePath();
        const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: false });
        malha = new THREE.Mesh(geo, materialPiso);
        malha.rotation.x = -Math.PI / 2;
        malha.position.y = 0.0;
        malha.castShadow = false;
        malha.receiveShadow = true;
        grupoInterior.add(malha);
      } else {
        malha = caixa(grupoInterior, room.w, 0.04, room.d, room.x + room.w / 2, 0.02, room.z + room.d / 2, materialPiso, false);
        malha.receiveShadow = true;
      }
      malha.userData.comodos = [room.id];
      malha.userData.papel = 'piso';
      centroDosComodos[room.id] = { x: room.x + room.w / 2, z: room.z + room.d / 2 };
    }

    // ---- Paredes, portas e janelas ----
    const blocos = redeDeParedes(modelo);
    for (const b of blocos) {
      const altura = b.yTopo - b.yBase;
      if (altura <= 0.02) continue;
      const material = b.externa ? MAT.externa : b.tipo === 'parede' ? MAT.interna : MAT.verga;
      const destino = b.externa ? grupoExterior : grupoInterior;
      let malha;
      if (b.eixo === 'd') {
        const comprimento = Math.hypot(b.x2 - b.x1, b.z2 - b.z1);
        if (comprimento <= 0.02) continue;
        const rotY = -Math.atan2(b.z2 - b.z1, b.x2 - b.x1);
        malha = caixa(destino, comprimento, altura, b.espessura, (b.x1 + b.x2) / 2, (b.yBase + b.yTopo) / 2, (b.z1 + b.z2) / 2, material);
        malha.rotation.y = rotY;
        if (b.yBase < 1.6 && b.yTopo > 0.25) {
          colisores.push({
            x0: Math.min(b.x1, b.x2) - b.espessura / 2,
            x1: Math.max(b.x1, b.x2) + b.espessura / 2,
            z0: Math.min(b.z1, b.z2) - b.espessura / 2,
            z1: Math.max(b.z1, b.z2) + b.espessura / 2,
          });
        }
      } else {
        const comprimento = b.fim - b.ini;
        if (comprimento <= 0.02) continue;
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
      }
      malha.userData.comodos = b.comodos?.length ? b.comodos : comodosDaAbertura(b, modelo.rooms);
      malha.userData.papel = 'parede';
      malha.userData.tipoBloco = b.tipo;
      malha.userData.origY = malha.position.y;
      occluders.push(malha);
    }

    // ---- Batentes, esquadrias e vidros ----
    for (const a of aberturasVisiveis(modelo)) {
      if (a.vao) continue; // vão livre sem batente de porta
      const esp = env.espExterna;
      const barra = a.tipo === 'porta' ? MAT.batente : MAT.esquadria;
      const larg = a.largura;
      const alt = a.altura;
      const peitoril = a.peitoril;
      const yCentro = peitoril + alt / 2;
      const comodosAbertura = comodosDaAbertura(a, modelo.rooms);

      if (a.eixo === 'd') {
        const rotY = -Math.atan2(a.z2 - a.z1, a.x2 - a.x1);
        const grupoDiag = new THREE.Group();
        grupoDiag.position.set((a.x1 + a.x2) / 2, 0, (a.z1 + a.z2) / 2);
        grupoDiag.rotation.y = rotY;
        grupoDiag.userData.comodos = comodosAbertura;
        grupoDiag.userData.papel = 'abertura';
        caixa(grupoDiag, 0.05, alt, esp + 0.04, -larg / 2 + 0.025, yCentro, 0, barra);
        caixa(grupoDiag, 0.05, alt, esp + 0.04, larg / 2 - 0.025, yCentro, 0, barra);
        caixa(grupoDiag, larg, 0.05, esp + 0.04, 0, peitoril + alt - 0.025, 0, barra);
        grupoExterior.add(grupoDiag);
        continue;
      }

      const hHorizontal = a.eixo === 'h';
      const grupoAb = new THREE.Group();
      grupoAb.userData.comodos = comodosAbertura;
      grupoAb.userData.papel = 'abertura';
      const criarBarra = (bw, bh, bd, dx, dy, dz) => {
        if (hHorizontal) caixa(grupoAb, bw, bh, bd, a.ini + larg / 2 + dx, dy, a.coord + dz, barra);
        else caixa(grupoAb, bd, bh, bw, a.coord + dz, dy, a.ini + larg / 2 + dx, barra);
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
        grupoAb.add(vidro);
      }
      grupoExterior.add(grupoAb);
    }

    // ---- Alvenaria / concreto embutido (guarda-roupas de concreto e banheiro da suíte em L) ----
    for (const room of modelo.rooms) {
      const alt = env.peDireito;
      if (room.id === 'quarto2') {
        // Extensão em L do Banheiro da Suíte (junto à parede da janela x = room.x, profundidade 0,65 m)
        const prof = 0.65;
        const largL = 0.85;
        const zFrente = room.z + room.d; // parede com banheiro2
        const zFace = zFrente - prof; // face frontal alinhada do L + guarda-roupa de concreto
        const grupoL = new THREE.Group();
        grupoL.userData.comodos = ['quarto2', 'banheiro2'];
        grupoL.userData.papel = 'embutido';
        grupoL.userData.origY = 0;
        const matPisoBanho = new THREE.MeshStandardMaterial({ color: PISOS.ceramica.cor, roughness: 0.5 });
        matPisoBanho.userData.proprio = true;
        const pisoL = caixa(grupoInterior, largL, 0.045, prof, room.x + largL / 2, 0.025, zFrente - prof / 2, matPisoBanho, false);
        pisoL.userData.comodos = ['quarto2', 'banheiro2'];
        pisoL.userData.papel = 'piso';

        const divL = caixa(grupoL, 0.12, alt, prof, room.x + largL, alt / 2, zFrente - prof / 2, MAT.interna);
        occluders.push(divL);
        const altPorta = 2.1;
        if (alt > altPorta + 0.05) {
          const vergaL = caixa(grupoL, largL, alt - altPorta, 0.12, room.x + largL / 2, (altPorta + alt) / 2, zFace, MAT.interna);
          occluders.push(vergaL);
        }
        const largPorta = 0.72;
        const xPortaCentro = room.x + largL / 2;
        caixa(grupoL, 0.05, altPorta, 0.14, xPortaCentro - largPorta / 2 + 0.025, altPorta / 2, zFace, MAT.batente);
        caixa(grupoL, 0.05, altPorta, 0.14, xPortaCentro + largPorta / 2 - 0.025, altPorta / 2, zFace, MAT.batente);
        caixa(grupoL, largPorta, 0.05, 0.14, xPortaCentro, altPorta - 0.025, zFace, MAT.batente);
        grupoInterior.add(grupoL);

        // Guarda-roupa de CONCRETO embutido na parede (logo ao lado do L, até o início da porta do corredor interno)
        const xIniGR = room.x + largL + 0.06;
        const largGR = Math.max(0.8, Math.min(1.52, room.w - largL - 1.15));
        const xCentroGR = xIniGR + largGR / 2;
        const grupoGR2 = new THREE.Group();
        grupoGR2.userData.comodos = ['quarto2'];
        grupoGR2.userData.papel = 'embutido';
        grupoGR2.userData.origY = 0;
        const grConcreto = caixa(grupoGR2, largGR, alt, prof, xCentroGR, alt / 2, zFrente - prof / 2, MAT.interna);
        occluders.push(grConcreto);
        colisores.push({ x0: xIniGR, x1: xIniGR + largGR, z0: zFace, z1: zFrente });
        caixa(grupoGR2, largGR - 0.14, 2.05, 0.04, xCentroGR, 1.05, zFace - 0.01, MAT.madeira);
        grupoInterior.add(grupoGR2);
      } else if (room.id === 'quarto1') {
        const prof = 0.65;
        const largGR = Math.max(0.8, Math.min(1.65, room.w - 1.25));
        const xCentroGR = room.x + largGR / 2 + 0.04;
        const zCentroGR = room.z + prof / 2;
        const grupoGR1 = new THREE.Group();
        grupoGR1.userData.comodos = ['quarto1'];
        grupoGR1.userData.papel = 'embutido';
        grupoGR1.userData.origY = 0;
        const grConcreto = caixa(grupoGR1, largGR, alt, prof, xCentroGR, alt / 2, zCentroGR, MAT.interna);
        occluders.push(grConcreto);
        colisores.push({ x0: room.x + 0.04, x1: room.x + 0.04 + largGR, z0: room.z, z1: room.z + prof });
        caixa(grupoGR1, largGR - 0.14, 2.05, 0.04, xCentroGR, 1.05, room.z + prof + 0.01, MAT.madeira);
        grupoInterior.add(grupoGR1);
      }
    }

    // ---- Móveis editáveis (casa.moveis) e etiquetas ----
    reconstruirMoveis(modelo);
    for (const room of modelo.rooms) {
      const etiqueta = criarEtiqueta(room.nome, `${areaComodo(room).toFixed(1).replace('.', ',')} m²`, room.cor);
      etiqueta.position.set(room.x + room.w / 2, env.peDireito + 0.25, room.z + room.d / 2);
      etiqueta.userData.comodoId = room.id;
      grupoEtiquetas.add(etiqueta);
    }

    raiz.userData.colisores = colisores;
  }

  function reconstruirMoveis(modelo) {
    modeloAtual = modelo;
    limparGrupo(grupoMobilia);
    selecionaveisMoveis = [];
    const porId = new Map(modelo.rooms.map((r) => [r.id, r]));
    const lista = Array.isArray(modelo.moveis) ? modelo.moveis : [];
    for (const movel of lista) {
      const room = porId.get(movel.comodoId);
      if (!room) continue;
      const g = criarMovel3D(movel, room);
      grupoMobilia.add(g);
      g.traverse((obj) => {
        if (obj.isMesh) selecionaveisMoveis.push(obj);
      });
    }
    if (ultimoFiltroVisibilidade && Object.keys(ultimoFiltroVisibilidade).length) {
      definirVisibilidade(ultimoFiltroVisibilidade);
    }
  }

  function destacarMovel(movelId) {
    limparGrupo(grupoDestaqueMovel);
    if (!movelId) return;
    const movel = (modeloAtual.moveis || []).find((m) => m.id === movelId);
    if (!movel) return;
    const room = modeloAtual.rooms.find((r) => r.id === movel.comodoId);
    if (!room) return;
    const hw = movel.w / 2 + 0.07;
    const hd = movel.d / 2 + 0.07;
    const pts = [
      new THREE.Vector3(-hw, 0.09, -hd),
      new THREE.Vector3(hw, 0.09, -hd),
      new THREE.Vector3(hw, 0.09, hd),
      new THREE.Vector3(-hw, 0.09, hd),
      new THREE.Vector3(-hw, 0.09, -hd),
    ];
    const linha = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: 0x22c55e })
    );
    linha.material.userData.proprio = true;
    const wrap = new THREE.Group();
    wrap.position.set(room.x + movel.x, 0, room.z + movel.z);
    wrap.rotation.y = THREE.MathUtils.degToRad(-(movel.rot || 0));
    wrap.add(linha);
    grupoDestaqueMovel.add(wrap);
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
    const poly = poligonoComodo(room);
    if (poly.length > 4) {
      const shape = new THREE.Shape();
      poly.forEach(([px, pz], idx) => {
        if (idx === 0) shape.moveTo(px, -pz);
        else shape.lineTo(px, -pz);
      });
      shape.closePath();
      const piso = new THREE.Mesh(new THREE.ShapeGeometry(shape), material);
      piso.rotation.x = -Math.PI / 2;
      piso.position.y = 0.075;
      grupoDestaque.add(piso);
    } else {
      const piso = new THREE.Mesh(new THREE.PlaneGeometry(room.w, room.d), material);
      piso.rotation.x = -Math.PI / 2;
      piso.position.set(room.x + room.w / 2, 0.075, room.z + room.d / 2);
      grupoDestaque.add(piso);
    }

    const pontos = [...poly.map(([px, pz]) => new THREE.Vector3(px, 0.085, pz)), new THREE.Vector3(poly[0][0], 0.085, poly[0][1])];
    const linha = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pontos),
      new THREE.LineBasicMaterial({ color: room.cor })
    );
    linha.material.userData.proprio = true;
    grupoDestaque.add(linha);
  }

  function definirVisibilidade({ interior = true, mobilia = true, etiquetas = true, selecionado = null, isolar = false, paredes = 'inteiras' } = {}) {
    ultimoFiltroVisibilidade = { interior, mobilia, etiquetas, selecionado, isolar, paredes };
    const isolado = isolar && selecionado ? selecionado : null;
    const modoParedes = paredes === false ? 'ocultas' : paredes === 'baixas' || paredes === 'ocultas' ? paredes : 'inteiras';

    const aplicarNosFilhos = (grupo) => {
      for (const filho of grupo.children) {
        const lista = filho.userData?.comodos;
        const passaIsolado = !isolado || (Array.isArray(lista) && lista.includes(isolado));
        if (!passaIsolado) {
          filho.visible = false;
          continue;
        }
        const papel = filho.userData?.papel;
        if (papel === 'piso' || !papel) {
          filho.visible = true;
          continue;
        }
        if (modoParedes === 'ocultas') {
          filho.visible = false;
          continue;
        }
        if (modoParedes === 'baixas') {
          if (papel === 'abertura' || filho.userData?.tipoBloco === 'verga') {
            filho.visible = false;
          } else {
            filho.visible = true;
            const fator = 0.14;
            filho.scale.y = fator;
            if (typeof filho.userData?.origY === 'number') {
              filho.position.y = filho.userData.origY * fator;
            }
          }
          continue;
        }
        // modoParedes === 'inteiras'
        filho.visible = true;
        filho.scale.y = 1;
        if (typeof filho.userData?.origY === 'number') {
          filho.position.y = filho.userData.origY;
        }
      }
    };

    grupoInterior.visible = interior;
    grupoMobilia.visible = interior && mobilia;
    grupoEtiquetas.visible = interior && etiquetas;
    aplicarNosFilhos(grupoExterior);
    aplicarNosFilhos(grupoInterior);
    aplicarNosFilhos(grupoMobilia);

    for (const sprite of grupoEtiquetas.children) {
      sprite.visible = !selecionado || sprite.userData.comodoId === selecionado;
    }
    grupoDestaque.visible = interior;
  }

  reconstruir(casa);

  return {
    raiz,
    reconstruir,
    reconstruirMoveis,
    destacar,
    destacarMovel,
    definirVisibilidade,
    get colisores() {
      return raiz.userData.colisores || [];
    },
    get occluders() {
      return occluders;
    },
    get selecionaveisMoveis() {
      return selecionaveisMoveis;
    },
    centroDoComodo(id) {
      return centroDosComodos[id] || null;
    },
  };
}
