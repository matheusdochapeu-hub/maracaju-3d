/**
 * captura.js — Câmera, vídeo, galeria local e pacote de reconstrução 3D.
 *
 * As mídias ficam no IndexedDB do aparelho (nada sobe para servidor). O botão
 * "Exportar pacote 3D" monta um .zip com as fotos organizadas por área e um
 * manifesto, pronto para Scaniverse, Colab/VGGT ou qualquer fotogrametria.
 */

import { ROTEIRO_CAPTURA } from './config.js';
import { parseJpegExif, gpsParaLocal } from './exif.js';
import { criarZip } from './zip.js';
import { baixarArquivo, bytesLegivel, escaparHtml, vibrar } from './utils.js';
import { initWallPlanner } from './wall-planner.js';

const DB_NOME = 'maracaju3d_midias';
const DB_VERSAO = 1;
const STORE = 'midias';

let banco = null;
let cache = [];
let contagem = {};
let apiEstudio = null;
let fecharEstudio = null;

function abrirBanco() {
  if (banco) return Promise.resolve(banco);
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB indisponível'));
      return;
    }
    const req = indexedDB.open(DB_NOME, DB_VERSAO);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('area', 'area');
      }
    };
    req.onsuccess = () => {
      banco = req.result;
      resolve(banco);
    };
    req.onerror = () => reject(req.error || new Error('Falha ao abrir o banco'));
  });
}

function transacao(modo) {
  return abrirBanco().then((db) => db.transaction(STORE, modo).objectStore(STORE));
}

async function salvarMidia(item) {
  try {
    const store = await transacao('readwrite');
    await new Promise((resolve, reject) => {
      const req = store.put(item);
      req.onsuccess = resolve;
      req.onerror = () => reject(req.error);
    });
    cache.unshift(item);
    contagem[item.area] = (contagem[item.area] || 0) + (item.tipo === 'foto' ? 1 : 0);
    return true;
  } catch (erro) {
    console.warn('Não foi possível salvar a mídia', erro);
    return false;
  }
}

async function removerDoBanco(id) {
  const store = await transacao('readwrite');
  await new Promise((resolve, reject) => {
    const req = store.delete(id);
    req.onsuccess = resolve;
    req.onerror = () => reject(req.error);
  });
  cache = cache.filter((m) => m.id !== id);
  recalcularContagem();
}

async function limparBanco() {
  const store = await transacao('readwrite');
  await new Promise((resolve, reject) => {
    const req = store.clear();
    req.onsuccess = resolve;
    req.onerror = () => reject(req.error);
  });
  cache = [];
  contagem = {};
}

async function carregarTudo() {
  try {
    const store = await transacao('readonly');
    const itens = await new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    cache = itens.sort((a, b) => b.ts - a.ts);
    recalcularContagem();
    return cache;
  } catch {
    cache = [];
    contagem = {};
    return [];
  }
}

function recalcularContagem() {
  contagem = {};
  for (const item of cache) {
    if (item.tipo === 'foto') contagem[item.area] = (contagem[item.area] || 0) + 1;
  }
}

/** Comprime a foto para não estourar a memória do celular. */
async function prepararImagem(arquivo, maxLado = 1600, qualidade = 0.86) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(arquivo);
  } catch {
    bitmap = await new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(arquivo);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Formato de imagem não suportado'));
      };
      img.src = url;
    });
  }
  const larguraOriginal = bitmap.width || bitmap.naturalWidth;
  const alturaOriginal = bitmap.height || bitmap.naturalHeight;
  const escala = Math.min(1, maxLado / Math.max(larguraOriginal, alturaOriginal));
  const largura = Math.max(1, Math.round(larguraOriginal * escala));
  const altura = Math.max(1, Math.round(alturaOriginal * escala));

  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, largura, altura);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', qualidade));

  const escalaThumb = Math.min(1, 340 / Math.max(largura, altura));
  const canvasThumb = document.createElement('canvas');
  canvasThumb.width = Math.max(1, Math.round(largura * escalaThumb));
  canvasThumb.height = Math.max(1, Math.round(altura * escalaThumb));
  canvasThumb.getContext('2d').drawImage(canvas, 0, 0, canvasThumb.width, canvasThumb.height);

  return {
    blob: blob || arquivo,
    thumb: canvasThumb.toDataURL('image/jpeg', 0.7),
    largura,
    altura,
    bytes: blob?.size || arquivo.size,
  };
}

async function exifDaFoto(arquivo) {
  try {
    if (!/jpe?g$/i.test(arquivo.name) && !/jpe?g/i.test(arquivo.type)) return null;
    const bruto = await arquivo.arrayBuffer();
    return parseJpegExif(bruto);
  } catch {
    return null;
  }
}

function novoId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function areaSegura(area) {
  return String(area || 'geral').replace(/[^a-z0-9_-]/gi, '-');
}

export async function iniciarCaptura(ctx) {
  const { estado, casa, toast } = ctx;
  const els = {
    areas: document.getElementById('capturaAreas'),
    galeria: document.getElementById('galeria'),
    filtro: document.getElementById('filtroGaleria'),
    armazenamento: document.getElementById('armazenamento'),
    contador: document.getElementById('contadorMidias'),
    btnZip: document.getElementById('btnExportarZip'),
    btnAbrir: document.getElementById('btnAbrirCamera'),
    inputFotos: document.getElementById('inputFotos'),
    inputVideo: document.getElementById('inputVideo'),
    inputFallback: document.getElementById('inputFotoFallback'),
    modal: document.getElementById('modalCamera'),
    video: document.getElementById('videoCamera'),
    camArea: document.getElementById('camArea'),
    camNota: document.getElementById('camNota'),
    camRec: document.getElementById('camRec'),
    camTempo: document.getElementById('camTempo'),
    camAviso: document.getElementById('camAviso'),
    camContador: document.getElementById('camContador'),
    camTitulo: document.getElementById('camTitulo'),
    foco: document.getElementById('camFallback'),
    btnDisparar: document.getElementById('btnDisparar'),
    btnGravar: document.getElementById('btnGravar'),
    btnTrocar: document.getElementById('btnTrocarCamera'),
    btnFechar: document.getElementById('btnFecharCamera'),
    modalFoto: document.getElementById('modalFoto'),
    fotoGrande: document.getElementById('fotoGrande'),
    fotoTitulo: document.getElementById('fotoTitulo'),
    fotoMeta: document.getElementById('fotoMeta'),
    btnBaixarFoto: document.getElementById('btnBaixarFoto'),
    btnExcluirFoto: document.getElementById('btnExcluirFoto'),
    btnFecharFoto: document.getElementById('btnFecharFoto'),
    overlayEstudio: document.getElementById('overlayEstudio'),
  };

  let filtro = 'todas';
  let stream = null;
  let gravador = null;
  let pedacos = [];
  let inicioGravacao = 0;
  let timerGravacao = null;
  let fotoAberta = null;
  let urlFoto = null;
  let gpsSessao = null;
  let pedindoSol = false;

  // ============================ ESTÚDIO ============================
  apiEstudio = initWallPlanner(toast);

  function abrirEstudio(comItem) {
    els.overlayEstudio.hidden = false;
    if (comItem) {
      const url = URL.createObjectURL(comItem.blob);
      apiEstudio.loadPhotoFromUrl(
        url,
        `${comItem.area}-${comItem.id}.jpg`,
        `<strong>📷 ${escaparHtml(ROTEIRO_CAPTURA[comItem.area]?.titulo || comItem.area)}</strong><br>Capturada no app em ${new Date(comItem.ts).toLocaleString('pt-BR')}`
      );
    }
  }

  document.getElementById('btnAbrirEstudio').addEventListener('click', () => abrirEstudio());
  document.getElementById('btnFecharEstudio').addEventListener('click', () => {
    els.overlayEstudio.hidden = true;
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !els.overlayEstudio.hidden) els.overlayEstudio.hidden = true;
  });

  // ============================ ÁREAS ============================
  function areaTitulo(id) {
    return ROTEIRO_CAPTURA[id]?.titulo || id;
  }

  function renderAreas() {
    const areas = Object.entries(ROTEIRO_CAPTURA);
    els.areas.innerHTML = areas
      .map(([id, cfg]) => {
        const feitas = contagem[id] || 0;
        const pct = Math.min(100, Math.round((feitas / cfg.alvo) * 100));
        return `
          <div class="area-card ${feitas >= cfg.alvo ? 'completo' : ''}" data-area-card="${id}">
            <div class="area-cabecalho">
              <strong>${escaparHtml(cfg.titulo)}</strong>
              <span>${feitas}/${cfg.alvo}</span>
            </div>
            <div class="barra-progresso"><i style="width:${pct}%"></i></div>
            <ul class="dicas">${cfg.dicas.slice(0, 2).map((d) => `<li>${escaparHtml(d)}</li>`).join('')}</ul>
            <button class="btn sm ${feitas >= cfg.alvo ? '' : 'primario'}" data-capturar="${id}">
              ${feitas >= cfg.alvo ? '📸 Mais fotos' : '📸 Fotografar'}
            </button>
          </div>`;
      })
      .join('');
  }

  els.areas.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-capturar]');
    if (!btn) return;
    abrirCamera(btn.dataset.capturar);
  });

  // ============================ GALERIA ============================
  function renderFiltro() {
    const areas = Object.keys(ROTEIRO_CAPTURA).filter((id) => (contagem[id] || 0) > 0);
    els.filtro.innerHTML = [
      `<button class="chip ${filtro === 'todas' ? 'ativo' : ''}" data-filtro="todas">Todas (${cache.length})</button>`,
      ...areas.map(
        (id) =>
          `<button class="chip ${filtro === id ? 'ativo' : ''}" data-filtro="${id}">${escaparHtml(areaTitulo(id))} (${contagem[id]})</button>`
      ),
    ].join('');
  }

  function renderGaleria() {
    if (filtro !== 'todas' && !cache.some((m) => m.area === filtro)) filtro = 'todas';
    renderFiltro();
    const itens = filtro === 'todas' ? cache : cache.filter((m) => m.area === filtro);
    els.contador.textContent = `${cache.length} item${cache.length === 1 ? '' : 's'}`;
    if (!itens.length) {
      els.galeria.innerHTML = `<div class="vazio">Nada aqui ainda. Toque em <b>Fotografar</b> para começar pelo cômodo mais fácil.</div>`;
    } else {
      els.galeria.innerHTML = itens
        .map((m) => {
          const data = new Date(m.ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          return `
          <div class="midia" data-midia="${m.id}">
            ${
              m.tipo === 'video'
                ? `<div class="sem-thumb" data-abrir="${m.id}" style="aspect-ratio:4/3;display:grid;place-items:center;background:#0b141d;cursor:pointer;font-size:28px">🎥</div>`
                : `<img src="${m.thumb}" alt="Foto de ${escaparHtml(areaTitulo(m.area))}" data-abrir="${m.id}" loading="lazy" />`
            }
            ${m.tipo === 'video' ? '<span class="video-badge">VÍDEO</span>' : ''}
            <div class="info">
              <strong>${escaparHtml(areaTitulo(m.area))}</strong>
              <span>${data}</span>
            </div>
            <div class="info" style="border-top:1px solid var(--border)">
              <button class="btn sm" data-estudio="${m.id}" title="Usar como prévia">🧱</button>
              <button class="btn sm" data-baixar="${m.id}" title="Baixar">⬇️</button>
              <button class="btn sm perigo" data-apagar="${m.id}" title="Excluir">🗑️</button>
            </div>
          </div>`;
        })
        .join('');
    }
    atualizarArmazenamento();
  }

  async function atualizarArmazenamento() {
    const bytes = cache.reduce((soma, m) => soma + (m.bytes || 0), 0);
    const fotos = cache.filter((m) => m.tipo === 'foto').length;
    const videos = cache.length - fotos;
    let texto = `${fotos} foto${fotos === 1 ? '' : 's'}`;
    if (videos) texto += ` · ${videos} vídeo${videos === 1 ? '' : 's'}`;
    texto += ` · ${bytesLegivel(bytes)}`;
    els.armazenamento.textContent = texto;
    els.camContador.textContent = `${contagem[estado.areaCamera] || 0} fotos nesta área`;
    try {
      const estimativa = await navigator.storage?.estimate?.();
      if (estimativa?.usage && estimativa.quota) {
        els.armazenamento.title = `Usado pelo site: ${bytesLegivel(estimativa.usage)} de ${bytesLegivel(estimativa.quota)}`;
      }
    } catch {
      /* sem estimativa */
    }
  }

  els.filtro.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-filtro]');
    if (!btn) return;
    filtro = btn.dataset.filtro;
    renderGaleria();
  });

  els.galeria.addEventListener('click', async (e) => {
    const apagar = e.target.closest('[data-apagar]');
    if (apagar) {
      if (!confirm('Excluir esta captura?')) return;
      await removerDoBanco(apagar.dataset.apagar);
      renderGaleria();
      renderAreas();
      atualizarProgresso();
      return;
    }
    const baixar = e.target.closest('[data-baixar]');
    if (baixar) {
      const item = cache.find((m) => m.id === baixar.dataset.baixar);
      if (!item) return;
      baixarArquivo(`${areaSegura(item.area)}-${item.id}.${item.tipo === 'video' ? 'webm' : 'jpg'}`, item.blob);
      return;
    }
    const estudio = e.target.closest('[data-estudio]');
    if (estudio) {
      const item = cache.find((m) => m.id === estudio.dataset.estudio);
      if (item && item.tipo === 'foto') abrirEstudio(item);
      return;
    }
    const abrir = e.target.closest('[data-abrir]');
    if (abrir) {
      const item = cache.find((m) => m.id === abrir.dataset.abrir);
      if (item) abrirFoto(item);
    }
  });

  function abrirFoto(item) {
    fotoAberta = item;
    if (urlFoto) URL.revokeObjectURL(urlFoto);
    urlFoto = URL.createObjectURL(item.blob);
    els.fotoTitulo.textContent = areaTitulo(item.area);
    els.fotoMeta.textContent = `${new Date(item.ts).toLocaleString('pt-BR')}${item.nota ? ` · ${item.nota}` : ''}${
      item.gps ? ` · GPS ${item.gps.lat}, ${item.gps.lng} (±${Math.round(item.gps.precisao || 0)} m)` : ''
    }`;
    if (item.tipo === 'video') {
      const video = document.createElement('video');
      video.id = 'fotoGrande';
      video.src = urlFoto;
      video.controls = true;
      video.playsInline = true;
      video.style.width = '100%';
      video.style.maxHeight = '62dvh';
      video.style.borderRadius = '8px';
      video.style.background = '#05090d';
      video.style.marginBottom = '8px';
      els.fotoGrande.replaceWith(video);
      els.fotoGrande = video;
    } else {
      const atual = document.getElementById('fotoGrande');
      if (atual.tagName === 'VIDEO') {
        const img = document.createElement('img');
        img.id = 'fotoGrande';
        img.alt = 'Foto da captura';
        atual.replaceWith(img);
        els.fotoGrande = img;
      }
      els.fotoGrande.src = urlFoto;
    }
    els.modalFoto.hidden = false;
  }

  function fecharFoto() {
    els.modalFoto.hidden = true;
    if (els.fotoGrande.tagName === 'VIDEO') els.fotoGrande.pause?.();
    if (urlFoto) {
      URL.revokeObjectURL(urlFoto);
      urlFoto = null;
    }
    fotoAberta = null;
  }

  els.btnFecharFoto.addEventListener('click', fecharFoto);
  els.modalFoto.addEventListener('click', (e) => {
    if (e.target === els.modalFoto) fecharFoto();
  });
  els.btnBaixarFoto.addEventListener('click', () => {
    if (!fotoAberta) return;
    baixarArquivo(`${areaSegura(fotoAberta.area)}-${fotoAberta.id}.${fotoAberta.tipo === 'video' ? 'webm' : 'jpg'}`, fotoAberta.blob);
  });
  els.btnExcluirFoto.addEventListener('click', async () => {
    if (!fotoAberta) return;
    if (!confirm('Excluir esta captura?')) return;
    await removerDoBanco(fotoAberta.id);
    fecharFoto();
    renderGaleria();
    renderAreas();
    atualizarProgresso();
  });

  // ============================ CÂMERA ============================
  function preencherAreasSelect() {
    els.camArea.innerHTML = Object.entries(ROTEIRO_CAPTURA)
      .map(([id, cfg]) => `<option value="${id}">${escaparHtml(cfg.titulo)} (${contagem[id] || 0}/${cfg.alvo})</option>`)
      .join('');
  }

  async function pedirGPS() {
    if (gpsSessao || pedindoSol) return;
    if (!navigator.geolocation) return;
    pedindoSol = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        gpsSessao = {
          lat: +pos.coords.latitude.toFixed(6),
          lng: +pos.coords.longitude.toFixed(6),
          precisao: pos.coords.accuracy,
        };
        pedindoSol = false;
      },
      () => {
        pedindoSol = false;
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }

  async function abrirCamera(area) {
    estado.areaCamera = ROTEIRO_CAPTURA[area] ? area : estado.areaCamera || 'sala';
    preencherAreasSelect();
    els.camArea.value = estado.areaCamera;
    els.camNota.value = '';
    els.camTitulo.textContent = `Fotografar · ${areaTitulo(estado.areaCamera)}`;
    els.modal.hidden = false;
    els.camAviso.hidden = true;
    els.btnGravar.textContent = '● Vídeo';
    els.camRec.hidden = true;
    els.foco.hidden = true;
    await pedirGPS();
    await iniciarStream();
    atualizarArmazenamento();
  }

  async function iniciarStream() {
    pararStream();
    if (!navigator.mediaDevices?.getUserMedia) {
      mostrarFallback('Este navegador não expõe a câmera. Use o botão abaixo (câmera do celular).');
      return;
    }
    const tentativas = [
      { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: true },
      { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false },
      { video: true, audio: false },
    ];
    for (const restricoes of tentativas) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(restricoes);
        break;
      } catch (erro) {
        if (erro?.name === 'NotAllowedError') {
          mostrarFallback('Permissão de câmera negada. Libere nas configurações do navegador ou use a câmera nativa.');
          return;
        }
      }
    }
    if (!stream) {
      mostrarFallback('Não consegui abrir a câmera. Use a câmera nativa do celular pelo botão abaixo.');
      return;
    }
    els.video.srcObject = stream;
    await els.video.play().catch(() => {});
    els.camAviso.hidden = true;
    els.btnDisparar.disabled = false;
    els.btnGravar.disabled = false;
    els.foco.hidden = true;
  }

  function mostrarFallback(mensagem) {
    els.foco.hidden = false;
    els.camAviso.hidden = false;
    els.camAviso.textContent = mensagem;
    els.btnDisparar.disabled = true;
    els.btnGravar.disabled = true;
  }

  function pararStream() {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    els.video.srcObject = null;
    els.btnDisparar.disabled = false;
    els.btnGravar.disabled = false;
  }

  async function fecharCamera() {
    if (gravador && gravador.state === 'recording') gravador.stop();
    pararStream();
    els.modal.hidden = true;
  }

  els.btnFechar.addEventListener('click', fecharCamera);
  els.modal.addEventListener('click', (e) => {
    if (e.target === els.modal) fecharCamera();
  });

  els.btnTrocar.addEventListener('click', async () => {
    if (!stream) return;
    const atual = stream.getVideoTracks()[0]?.getSettings()?.facingMode;
    pararStream();
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: atual === 'user' ? 'environment' : 'user' },
        audio: false,
      });
      els.video.srcObject = stream;
      await els.video.play().catch(() => {});
    } catch {
      mostrarFallback('Não foi possível trocar de câmera.');
    }
  });

  function frameAtual() {
    const v = els.video;
    const vw = v.videoWidth || 1280;
    const vh = v.videoHeight || 720;
    const max = 1800;
    const escala = Math.min(1, max / Math.max(vw, vh));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(vw * escala);
    canvas.height = Math.round(vh * escala);
    canvas.getContext('2d').drawImage(v, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  els.btnDisparar.addEventListener('click', async () => {
    if (!stream) return;
    vibrar(14);
    const area = els.camArea.value;
    const nota = els.camNota.value.trim();
    const canvas = frameAtual();
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.86));
    if (!blob) {
      toast('Não consegui gerar a foto. Tente novamente.');
      return;
    }
    const canvasThumb = document.createElement('canvas');
    const escala = Math.min(1, 340 / Math.max(canvas.width, canvas.height));
    canvasThumb.width = Math.round(canvas.width * escala);
    canvasThumb.height = Math.round(canvas.height * escala);
    canvasThumb.getContext('2d').drawImage(canvas, 0, 0, canvasThumb.width, canvasThumb.height);
    await salvarMidia({
      id: novoId(),
      tipo: 'foto',
      area,
      nota,
      ts: Date.now(),
      bytes: blob.size,
      largura: canvas.width,
      altura: canvas.height,
      thumb: canvasThumb.toDataURL('image/jpeg', 0.7),
      blob,
      gps: gpsSessao,
    });
    els.camNota.value = '';
    renderGaleria();
    renderAreas();
    atualizarProgresso();
    toast(`Foto salva em ${areaTitulo(area)}.`);
  });

  function mimeGravacao() {
    const opcoes = ['video/mp4;codecs=avc1', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    return opcoes.find((tipo) => window.MediaRecorder?.isTypeSupported?.(tipo)) || '';
  }

  els.btnGravar.addEventListener('click', async () => {
    if (!stream) return;
    if (gravador && gravador.state === 'recording') {
      gravador.stop();
      return;
    }
    if (!window.MediaRecorder) {
      toast('Este navegador não grava vídeo. Use a câmera nativa pelo botão de enviar vídeo.');
      return;
    }
    pedacos = [];
    try {
      const tipo = mimeGravacao();
      gravador = new MediaRecorder(stream, tipo ? { mimeType: tipo } : undefined);
    } catch {
      toast('Não foi possível iniciar a gravação neste navegador.');
      return;
    }
    gravador.ondataavailable = (e) => {
      if (e.data && e.data.size) pedacos.push(e.data);
    };
    gravador.onstop = async () => {
      clearInterval(timerGravacao);
      els.camRec.hidden = true;
      els.btnGravar.textContent = '● Vídeo';
      els.btnGravar.classList.remove('ativo');
      const duracao = Math.round((Date.now() - inicioGravacao) / 1000);
      if (!pedacos.length) return;
      const blob = new Blob(pedacos, { type: pedacos[0].type || 'video/webm' });
      const poster = stream ? frameAtual() : null;
      const thumb = poster ? poster.toDataURL('image/jpeg', 0.6) : null;
      await salvarMidia({
        id: novoId(),
        tipo: 'video',
        area: els.camArea.value,
        nota: els.camNota.value.trim(),
        ts: Date.now(),
        bytes: blob.size,
        duracao,
        thumb,
        blob,
        gps: gpsSessao,
      });
      renderGaleria();
      renderAreas();
      atualizarProgresso();
      toast(`Vídeo de ${duracao}s salvo.`);
      els.camNota.value = '';
    };
    gravador.start(1000);
    inicioGravacao = Date.now();
    els.camRec.hidden = false;
    els.btnGravar.textContent = '■ Parar';
    els.btnGravar.classList.add('ativo');
    timerGravacao = setInterval(() => {
      const s = Math.floor((Date.now() - inicioGravacao) / 1000);
      els.camTempo.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    }, 250);
    vibrar(20);
  });

  els.btnAbrir.addEventListener('click', () => abrirCamera(estado.areaCamera || 'sala'));

  els.camArea.addEventListener('change', () => {
    estado.areaCamera = els.camArea.value;
    els.camTitulo.textContent = `Fotografar · ${areaTitulo(estado.areaCamera)}`;
    ctx.salvar();
  });

  // Fallback: câmera nativa do celular
  els.inputFallback.addEventListener('change', async (e) => {
    const arquivo = e.target.files?.[0];
    if (arquivo) await importarImagens([arquivo], els.camArea.value);
    e.target.value = '';
    els.modal.hidden = true;
  });

  // ============================ IMPORTAÇÃO ============================
  async function importarImagens(arquivos, area) {
    let importadas = 0;
    for (const arquivo of arquivos) {
      try {
        const preparada = await prepararImagem(arquivo);
        const exif = await exifDaFoto(arquivo);
        const gps = exif?.lat != null && exif?.lng != null ? { lat: exif.lat, lng: exif.lng, precisao: null } : gpsSessao;
        const item = {
          id: novoId(),
          tipo: 'foto',
          area: area || els.camArea.value || 'sala',
          nota: arquivo.name,
          ts: Date.now(),
          bytes: preparada.bytes,
          largura: preparada.largura,
          altura: preparada.altura,
          thumb: preparada.thumb,
          blob: preparada.blob,
          gps,
          exif: exif
            ? {
                bussola: exif.compass,
                data: exif.date,
                ...(gps ? gpsParaLocal(gps.lat, gps.lng, { lat: estado.lat, lng: estado.lng, azimute: estado.lotAzimuth || 40 }) : {}),
              }
            : null,
        };
        if (await salvarMidia(item)) importadas++;
      } catch {
        toast(`Não consegui ler "${arquivo.name}". Tente em JPEG.`);
      }
    }
    renderGaleria();
    renderAreas();
    atualizarProgresso();
    if (importadas) toast(`${importadas} foto${importadas === 1 ? '' : 's'} importada${importadas === 1 ? '' : 's'}.`);
  }

  els.inputFotos.addEventListener('change', async (e) => {
    const arquivos = [...(e.target.files || [])];
    if (arquivos.length) await importarImagens(arquivos, estado.areaCamera || 'sala');
    e.target.value = '';
  });

  els.inputVideo.addEventListener('change', async (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    const ok = await salvarMidia({
      id: novoId(),
      tipo: 'video',
      area: estado.areaCamera || 'sala',
      nota: arquivo.name,
      ts: Date.now(),
      bytes: arquivo.size,
      thumb: null,
      blob: arquivo,
      gps: gpsSessao,
    });
    e.target.value = '';
    if (ok) {
      renderGaleria();
      renderAreas();
      atualizarProgresso();
      toast('Vídeo importado da galeria.');
    }
  });

  // ============================ PACOTE 3D ============================
  els.btnZip.addEventListener('click', async () => {
    if (!cache.length) {
      toast('Capture pelo menos uma foto antes de exportar.');
      return;
    }
    const rotulo = els.btnZip.textContent;
    els.btnZip.disabled = true;
    els.btnZip.textContent = 'Montando pacote…';
    try {
      const arquivos = [];
      const manifesto = {
        projeto: 'Maracaju 3D — Casa 88',
        criado_em: new Date().toISOString(),
        origem: { lat: estado.lat, lng: estado.lng, azimute_lote: estado.lotAzimuth || 40 },
        casa: {
          largura_m: +(casa.envelope.x1 - casa.envelope.x0).toFixed(2),
          comprimento_m: +(casa.envelope.z1 - casa.envelope.z0).toFixed(2),
          pe_direito_m: casa.envelope.peDireito,
          comodos: casa.rooms.map((r) => ({
            id: r.id,
            nome: r.nome,
            largura_m: +r.w.toFixed(2),
            profundidade_m: +r.d.toFixed(2),
            status: r.status,
          })),
        },
        areas: {},
        itens: [],
      };
      const contador = {};
      for (const item of cache) {
        contador[item.area] = contador[item.area] || { fotos: 0, videos: 0 };
        contador[item.area][item.tipo === 'foto' ? 'fotos' : 'videos']++;
        manifesto.areas[item.area] = contador[item.area];
        const seq = String(contador[item.area].fotos + contador[item.area].videos).padStart(2, '0');
        const extensao = item.tipo === 'video' ? 'webm' : 'jpg';
        const nome = `${item.tipo === 'foto' ? 'fotos' : 'videos'}/${areaSegura(item.area)}/${seq}-${item.id}.${extensao}`;
        arquivos.push({ nome, dados: item.blob });
        manifesto.itens.push({
          arquivo: nome,
          area: item.area,
          tipo: item.tipo,
          data: new Date(item.ts).toISOString(),
          nota: item.nota || '',
          gps: item.gps || null,
          exif: item.exif || null,
        });
      }
      arquivos.push({ nome: 'manifest.json', dados: new TextEncoder().encode(JSON.stringify(manifesto, null, 2)) });
      arquivos.push({
        nome: 'LEIA-ME.txt',
        dados: new TextEncoder().encode(
          [
            'PACOTE DE RECONSTRUÇÃO 3D — CASA MARACAJU 88',
            '',
            '1) Scaniverse (mais rápido): importe as fotos no app ou escaneie de novo e exporte .glb.',
            '2) Google Colab (VGGT/MASt3R): suba este .zip no script tools/colab_3d_reconstruct.py.',
            '3) Fotogrametria: as fotos estão agrupadas por área; use 70% de sobreposição.',
            '',
            'O manifesto.json traz as medidas dos cômodos para escalar o modelo.',
            'No app: aba Casa 3D → Importar scan.',
          ].join('\n')
        ),
      });
      const zip = await criarZip(arquivos);
      const data = new Date().toISOString().slice(0, 10);
      baixarArquivo(`maracaju-3d-capturas-${data}.zip`, zip);
      toast('Pacote pronto! Envie para o Colab ou abra no Scaniverse.');
    } catch (erro) {
      console.error(erro);
      toast('Não foi possível montar o pacote. Tente com menos fotos.');
    } finally {
      els.btnZip.disabled = false;
      els.btnZip.textContent = rotulo;
    }
  });

  document.getElementById('btnLimparFotos').addEventListener('click', async () => {
    if (!cache.length) return;
    if (!confirm(`Apagar todas as ${cache.length} capturas deste dispositivo? O backup JSON não inclui fotos.`)) return;
    await limparBanco();
    renderGaleria();
    renderAreas();
    atualizarProgresso();
    toast('Capturas apagadas.');
  });

  // ============================ PROGRESSO ============================
  function atualizarProgresso() {
    if (ctx.atualizarProgresso) ctx.atualizarProgresso();
  }

  // ============================ INICIALIZAÇÃO ============================
  await carregarTudo();
  preencherAreasSelect();
  renderAreas();
  renderGaleria();

  return {
    contagens: () => ({ ...contagem }),
    abrirCamera,
    atualizarTudo() {
      renderAreas();
      renderGaleria();
    },
    fecharCamera,
  };
}
