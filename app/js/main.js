/**
 * main.js — Inicialização e cola da interface.
 *
 * Ordem: estado → mundo 3D → interiores → captura (IndexedDB) → levantamento.
 * As abas trocam o canvas de lugar em vez de criar um segundo renderer.
 */

import { MODULOS, GRUPOS_MODULOS, SITE, CHAVE_ESTADO, CHAVE_ESTADO_ANTIGO, CHAVE_DICAS, VERSAO, ROTEIRO_CAPTURA } from './config.js';
import { criarCasaPadrao, normalizarCasa, completudeCasa } from './casa-modelo.js';
import { normalizarFundo } from './planta.js';
import { criarMundo } from './mundo.js';
import { iniciarInteriores } from './interiores.js';
import { iniciarCaptura } from './captura.js';
import { iniciarLevantamento } from './levantamento.js';
import { baixarArquivo, escaparHtml, metros } from './utils.js';

// ============================ ESTADO ============================

/**
 * A planta do projeto é um arquivo de dados (app/data/casa.json). Assim, quando
 * a planta real chegar, dá para trocar o modelo sem mexer no código.
 */
async function lerCasaDoProjeto() {
  try {
    const resposta = await fetch('./data/casa.json', { cache: 'no-store' });
    if (!resposta.ok) return null;
    const bruto = await resposta.json();
    const casa = normalizarCasa(bruto);
    if (bruto.origem) casa.origem = String(bruto.origem).slice(0, 40);
    if (bruto.fonte) casa.fonte = String(bruto.fonte).slice(0, 300);
    casa.atualizadoEm = bruto.atualizadoEm || null;
    return casa;
  } catch {
    return null;
  }
}

const casaDoProjeto = await lerCasaDoProjeto();

function modulosPadrao() {
  const saida = {};
  for (const [id, cfg] of Object.entries(MODULOS)) {
    saida[id] = { visivel: cfg.visivel !== false, x: cfg.x, y: cfg.y ?? 0, z: cfg.z, rot: cfg.rot || 0 };
  }
  return saida;
}

function estadoPadrao() {
  return {
    versao: 3,
    app: 'maracaju3d',
    aba: 'casa3d',
    modo: '3d',
    lat: SITE.lat,
    lng: SITE.lng,
    lotAzimuth: SITE.azimuteLote,
    data: '2026-06-21',
    hora: 9.5,
    coberturaFundos: 'nenhuma',
    raioX: false,
    satelite: false,
    mobilia: true,
    etiquetas: true,
    moduloSelecionado: 'horta_15m',
    comodoSelecionado: 'sala',
    isolarComodo: false,
    modoParedes: 'inteiras',
    areaCamera: 'sala',
    plantaEditar: false,
    modulos: modulosPadrao(),
    casa: casaDoProjeto ? normalizarCasa(casaDoProjeto) : criarCasaPadrao(),
    plantaFundo: normalizarFundo(),
    atualizadoEm: null,
  };
}

/** Migra o cenário antigo (v1) sem perder as posições que o usuário já tinha. */
function migrarV1(antigo) {
  const novo = estadoPadrao();
  if (!antigo || typeof antigo !== 'object') return novo;
  for (const chave of ['lat', 'lng', 'lotAzimuth', 'dateStr', 'hour', 'xrayMode', 'showSatellite']) {
    if (antigo[chave] === undefined) continue;
    const destino = { dateStr: 'data', hour: 'hora', xrayMode: 'raioX', showSatellite: 'satelite' }[chave] || chave;
    novo[destino] = antigo[chave];
  }
  if (antigo.roofMode) {
    novo.coberturaFundos = antigo.roofMode === 'nenhuma' ? 'nenhuma' : antigo.roofMode === 'sanduiche' ? 'sanduiche' : 'mista';
  }
  if (antigo.modules && typeof antigo.modules === 'object') {
    for (const [id, cfg] of Object.entries(antigo.modules)) {
      if (!novo.modulos[id] || !cfg) continue;
      novo.modulos[id] = {
        ...novo.modulos[id],
        visivel: cfg.visible !== false,
        x: Number.isFinite(cfg.x) ? cfg.x : novo.modulos[id].x,
        y: Number.isFinite(cfg.y) ? cfg.y : novo.modulos[id].y,
        z: Number.isFinite(cfg.z) ? cfg.z : novo.modulos[id].z,
        rot: Number.isFinite(cfg.rot) ? cfg.rot : 0,
      };
    }
  }
  return novo;
}

function carregarEstado() {
  const padrao = estadoPadrao();
  let salvo = null;
  try {
    salvo = JSON.parse(localStorage.getItem(CHAVE_ESTADO) || 'null');
  } catch {
    salvo = null;
  }
  let migradoDeV1 = false;
  if (!salvo) {
    try {
      const antigo = JSON.parse(localStorage.getItem(CHAVE_ESTADO_ANTIGO) || 'null');
      if (antigo) {
        salvo = migrarV1(antigo);
        migradoDeV1 = true;
      }
    } catch {
      salvo = null;
    }
  }
  if (!salvo) return { estado: padrao, migradoDeV1 };

  const estado = {
    ...padrao,
    ...salvo,
    modulos: { ...padrao.modulos, ...(salvo.modulos || {}) },
    casa: normalizarCasa(salvo.casa),
    plantaFundo: normalizarFundo(salvo.plantaFundo),
  };
  if (!['casa3d', 'interiores', 'captura', 'levantamento'].includes(estado.aba)) estado.aba = 'casa3d';
  if (!['3d', 'planta', 'passeio'].includes(estado.modo)) estado.modo = '3d';
  if (!Number.isFinite(estado.lat) || !Number.isFinite(estado.lng)) {
    estado.lat = SITE.lat;
    estado.lng = SITE.lng;
  }
  estado.hora = Math.min(18.5, Math.max(5.5, Number(estado.hora) || 9.5));
  if (estado.aba !== 'interiores') estado.modo = '3d';
  estado.lotAzimuth = ((Number(estado.lotAzimuth) || 0) + 360) % 360;
  if (!ROTEIRO_CAPTURA[estado.areaCamera]) estado.areaCamera = 'sala';
  if (!estado.casa.rooms.some((r) => r.id === estado.comodoSelecionado)) {
    estado.comodoSelecionado = estado.casa.rooms[0]?.id || null;
  }
  return { estado, migradoDeV1 };
}

const { estado, migradoDeV1 } = carregarEstado();
const casa = estado.casa;
let contagensFotos = {};

// ============================ PERSISTÊNCIA ============================
let timerSalvar = null;
let ultimoSalvo = 0;

function persistirAgora() {
  clearTimeout(timerSalvar);
  timerSalvar = null;
  estado.atualizadoEm = new Date().toISOString();
  try {
    localStorage.setItem(CHAVE_ESTADO, JSON.stringify(estado));
    ultimoSalvo = Date.now();
  } catch (erro) {
    console.warn('Não foi possível salvar', erro);
    mostrarToast('Armazenamento cheio: exporte o backup e limpe capturas antigas.');
  }
}

function salvar() {
  if (timerSalvar) return;
  timerSalvar = setTimeout(persistirAgora, 220);
}

window.addEventListener('beforeunload', () => {
  if (timerSalvar) persistirAgora();
});

// ============================ TOAST ============================
let timerToast = null;
function mostrarToast(mensagem) {
  const el = document.getElementById('toast');
  el.textContent = mensagem;
  el.classList.add('visivel');
  clearTimeout(timerToast);
  timerToast = setTimeout(() => el.classList.remove('visivel'), 3400);
}

// ============================ MUNDO ============================
const mundo = criarMundo({
  obterEstado: () => estado,
  obterCasa: () => casa,
  aoAtualizarSol: (dados) => {
    document.querySelectorAll('[data-hud="azimute"]').forEach((el) => (el.textContent = dados.azimute));
    document.querySelectorAll('[data-hud="elevacao"]').forEach((el) => (el.textContent = dados.elevacao));
    document.querySelectorAll('[data-hud="dia"]').forEach(
      (el) => (el.textContent = `${dados.nascer} – ${dados.por} (${dados.horasDeLuz} h)`)
    );
    document.querySelectorAll('[data-sol="hora-label"]').forEach((el) => (el.textContent = dados.horaFormatada));
  },
});

// ============================ INTERIORES ============================
let captura = null;
const interiores = iniciarInteriores({
  estado,
  casa,
  mundo,
  salvar,
  atualizarTudo: () => atualizarTudo(),
  toast: mostrarToast,
  contarFotos: () => contagensFotos,
  abrirCamera: (area) => captura?.abrirCamera(area),
});

// ============================ CAPTURA ============================
try {
  captura = await iniciarCaptura({
    estado,
    casa,
    salvar: () => salvar(),
    toast: mostrarToast,
    atualizarProgresso: () => {
      atualizarProgresso();
      levantamento?.renderTudo();
    },
  });
  contagensFotos = captura.contagens();
} catch (erro) {
  console.error('Captura indisponível', erro);
  captura = {
    contagens: () => ({}),
    atualizarTudo() {},
    abrirCamera: () => mostrarToast('A câmera não está disponível neste navegador.'),
  };
  mostrarToast('Captura local indisponível: o resto do app continua funcionando.');
}

// ============================ LEVANTAMENTO ============================
const levantamento = iniciarLevantamento({
  estado,
  casa,
  salvar,
  toast: mostrarToast,
  contarFotos: () => contagensFotos,
  aplicarCasa: () => aplicarCasa(),
  irParaAba: (aba) => irParaAba(aba),
  irParaComodo: (id) => irParaComodo(id),
  abrirCamera: (area) => captura?.abrirCamera(area),
  exportarJson: () => exportarJson(),
  importarJson: (arquivo) => importarJson(arquivo),
  exportarModelo: () => exportarModelo(),
  importarModelo: (arquivo) => importarModelo(arquivo),
  carregarModeloDoProjeto: () => carregarModeloDoProjeto(),
  resetar: () => resetar(),
});

// ============================ PROGRESSO ============================
function atualizarProgresso() {
  const comp = completudeCasa(casa, contagensFotos);
  const pillBar = document.getElementById('pillBar');
  const pillText = document.getElementById('pillText');
  pillBar.style.width = `${comp.geral}%`;
  pillText.textContent = `${comp.geral}%`;
  const medidos = casa.rooms.filter((r) => r.status === 'medido').length;
  document.getElementById('pillProgresso').title = `${comp.geral}% do levantamento · ${medidos}/${casa.rooms.length} cômodos medidos`;
  document.getElementById('marcaSub').textContent = `${casa.rooms.length} cômodos · ${comp.geral}% levantado`;
}

// ============================ ABAS ============================
const palcoCasa = document.getElementById('palcoCasa');
const palcoInterior = document.getElementById('palcoInterior');
const canvas3d = document.getElementById('canvas3d');

function irParaAba(aba) {
  if (!['casa3d', 'interiores', 'captura', 'levantamento'].includes(aba)) return;
  estado.aba = aba;
  document.querySelectorAll('.tab-view').forEach((s) => s.classList.toggle('ativa', s.dataset.tab === aba));
  document.querySelectorAll('.aba').forEach((b) => {
    const ativa = b.dataset.tab === aba;
    b.classList.toggle('ativa', ativa);
    if (ativa) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });

  if (aba !== 'interiores' && estado.modo === 'passeio') {
    estado.modo = '3d';
    interiores.sairPasseio();
  }

  if (aba === 'casa3d' || aba === 'interiores') {
    const destino = aba === 'casa3d' ? palcoCasa : palcoInterior;
    if (canvas3d.parentElement !== destino) destino.prepend(canvas3d);
    requestAnimationFrame(() => {
      mundo.resize();
      atualizarTudo();
      if (aba === 'interiores') {
        interiores.aplicarModo();
        interiores.atualizarSol();
      }
    });
  } else {
    interiores.sairPasseio();
  }

  if (aba === 'captura') captura.atualizarTudo();
  if (aba === 'levantamento') levantamento.renderTudo();
  document.querySelector('.app')?.scrollTo?.({ top: 0 });
  salvar();
}

document.addEventListener('click', (e) => {
  const aba = e.target.closest('[data-tab]');
  if (aba && aba.classList.contains('aba')) {
    e.preventDefault();
    irParaAba(aba.dataset.tab);
    return;
  }
  const ir = e.target.closest('[data-ir]');
  if (ir) {
    e.preventDefault();
    irParaAba(ir.dataset.ir);
  }
});

// ============================ SOL ============================
let animando = false;
const ESTACOES = { verao: '2026-12-21', outono: '2026-03-21', inverno: '2026-06-21' };

function sincronizarControlesSol() {
  document.querySelectorAll('[data-sol="data"]').forEach((el) => (el.value = estado.data));
  document.querySelectorAll('[data-sol="hora"]').forEach((el) => (el.value = String(estado.hora)));
  const texto = `${String(Math.floor(estado.hora)).padStart(2, '0')}:${String(Math.round((estado.hora % 1) * 60)).padStart(2, '0')}`;
  document.querySelectorAll('[data-sol="hora-label"]').forEach((el) => (el.textContent = texto));
  const btnAnimar = document.querySelector('[data-sol="animar"]');
  if (btnAnimar) {
    btnAnimar.textContent = animando ? '⏸ Pausar' : '▶ Rodar o dia';
    btnAnimar.classList.toggle('ativo', animando);
  }
  const btnRaioX = document.querySelector('[data-sol="raiox"]');
  if (btnRaioX) {
    btnRaioX.textContent = estado.raioX ? '👁️ Só o telhado' : '👁️ Ver por dentro';
    btnRaioX.classList.toggle('ativo', estado.raioX);
  }
}

function definirData(data) {
  estado.data = data;
  salvar();
  sincronizarControlesSol();
  atualizarTudo();
  interiores.atualizarSol();
}

let timerSolComodo = null;
function definirHora(hora) {
  estado.hora = Math.min(18.5, Math.max(5.5, Number(hora)));
  sincronizarControlesSol();
  atualizarTudo();
  clearTimeout(timerSolComodo);
  timerSolComodo = setTimeout(() => interiores.atualizarSol(), 240);
}

document.addEventListener('input', (e) => {
  if (e.target.matches('[data-sol="hora"]')) {
    definirHora(e.target.value);
    salvar();
  }
});

document.addEventListener('change', (e) => {
  if (e.target.matches('[data-sol="data"]')) definirData(e.target.value || '2026-06-21');
  if (e.target.id === 'checkSatelite') {
    estado.satelite = e.target.checked;
    salvar();
    atualizarTudo();
  }
  if (e.target.id === 'checkMobilia') {
    estado.mobilia = e.target.checked;
    salvar();
    atualizarTudo();
  }
  if (e.target.id === 'checkEtiquetas') {
    estado.etiquetas = e.target.checked;
    salvar();
    atualizarTudo();
  }
});

document.addEventListener('click', (e) => {
  const estacao = e.target.closest('[data-estacao]');
  if (estacao) {
    const chave = estacao.dataset.estacao;
    definirData(chave === 'hoje' ? new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10) : ESTACOES[chave]);
    return;
  }
  const animar = e.target.closest('[data-sol="animar"]');
  if (animar) {
    animando = !animando;
    sincronizarControlesSol();
    return;
  }
  const raiox = e.target.closest('[data-sol="raiox"]');
  if (raiox) {
    estado.raioX = !estado.raioX;
    salvar();
    atualizarTudo();
    sincronizarControlesSol();
    mostrarToast(estado.raioX ? 'Telhado escondido: interiores visíveis.' : 'Telhado de volta.');
    return;
  }
  const cam = e.target.closest('[data-cam]');
  if (cam) {
    mundo.aplicarPreset(cam.dataset.cam);
  }
});

// ============================ TERRENO ============================
const inputLat = document.getElementById('inputLat');
const inputLng = document.getElementById('inputLng');
const inputAzimute = document.getElementById('inputAzimute');
const lblAzimute = document.getElementById('lblAzimute');
const selectCobertura = document.getElementById('selectCobertura');
const btnToggleCobertura = document.getElementById('btnToggleCobertura');
const checkSatelite = document.getElementById('checkSatelite');

function sincronizarTerreno() {
  inputLat.value = estado.lat.toFixed(6);
  inputLng.value = estado.lng.toFixed(6);
  inputAzimute.value = String(estado.lotAzimuth);
  lblAzimute.textContent = `${estado.lotAzimuth}°`;
  selectCobertura.value = estado.coberturaFundos;
  if (btnToggleCobertura) {
    const ativa = estado.coberturaFundos !== 'nenhuma';
    btnToggleCobertura.textContent = ativa
      ? '🏗️ Cobertura dos fundos: Ativa (tirar)'
      : '🏗️ Cobertura dos fundos: Sem cobertura (adicionar)';
    btnToggleCobertura.classList.toggle('ativo', ativa);
  }
  if (checkSatelite) checkSatelite.checked = estado.satelite;
}

inputLat.addEventListener('change', () => {
  estado.lat = Number(inputLat.value) || SITE.lat;
  salvar();
  atualizarTudo();
});
inputLng.addEventListener('change', () => {
  estado.lng = Number(inputLng.value) || SITE.lng;
  salvar();
  atualizarTudo();
});
inputAzimute.addEventListener('input', () => {
  estado.lotAzimuth = Number(inputAzimute.value) || 0;
  lblAzimute.textContent = `${estado.lotAzimuth}°`;
  atualizarTudo();
  salvar();
});
selectCobertura.addEventListener('change', () => {
  estado.coberturaFundos = selectCobertura.value;
  sincronizarTerreno();
  salvar();
  atualizarTudo();
});
btnToggleCobertura?.addEventListener('click', () => {
  estado.coberturaFundos = estado.coberturaFundos === 'nenhuma' ? 'sanduiche' : 'nenhuma';
  sincronizarTerreno();
  salvar();
  atualizarTudo();
  mostrarToast(
    estado.coberturaFundos === 'nenhuma'
      ? 'Cobertura dos fundos removida (estado atual).'
      : 'Cobertura dos fundos adicionada (muro dir. → queda sentido Visconde de Taunay).'
  );
});

document.getElementById('btnGps').addEventListener('click', () => {
  const btn = document.getElementById('btnGps');
  if (!navigator.geolocation) {
    mostrarToast('Este navegador não tem GPS.');
    return;
  }
  btn.disabled = true;
  btn.textContent = '📡 Buscando…';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      estado.lat = +pos.coords.latitude.toFixed(6);
      estado.lng = +pos.coords.longitude.toFixed(6);
      sincronizarTerreno();
      salvar();
      atualizarTudo();
      btn.disabled = false;
      btn.textContent = '📍 Usar meu GPS agora';
      mostrarToast(`GPS atualizado: ${estado.lat}, ${estado.lng} (±${Math.round(pos.coords.accuracy)} m).`);
    },
    (erro) => {
      btn.disabled = false;
      btn.textContent = '📍 Usar meu GPS agora';
      mostrarToast(`Não consegui ler o GPS (${erro.message}).`);
    },
    { enableHighAccuracy: true, timeout: 12000 }
  );
});

// ============================ MÓDULOS ============================
const elListaModulos = document.getElementById('listaModulos');
const elContadorModulos = document.getElementById('contadorModulos');

function renderModulos() {
  let total = 0;
  let ativos = 0;
  const html = Object.entries(GRUPOS_MODULOS)
    .map(([grupo, meta]) => {
      const itens = Object.entries(MODULOS).filter(([, cfg]) => cfg.grupo === grupo);
      if (!itens.length) return '';
      return (
        `<div class="grupo-titulo">${meta.icone} ${meta.titulo}</div>` +
        itens
          .map(([id, cfg]) => {
            total++;
            if (estado.modulos[id]?.visivel !== false) ativos++;
            return `
            <div class="modulo ${id === estado.moduloSelecionado ? 'ativo' : ''}" data-modulo="${id}" role="button" tabindex="0">
              <span class="ponto" style="background:${cfg.cor}"></span>
              <div class="texto">
                <div class="nome">${escaparHtml(cfg.nome)}</div>
                <div class="sub">${escaparHtml(cfg.curto)}</div>
              </div>
              <input type="checkbox" ${estado.modulos[id]?.visivel !== false ? 'checked' : ''} aria-label="Mostrar ${escaparHtml(cfg.nome)}" />
            </div>`;
          })
          .join('')
      );
    })
    .join('');
  elListaModulos.innerHTML = html;
  elContadorModulos.textContent = `${ativos}/${total}`;
}

function selecionarModulo(id) {
  if (!MODULOS[id]) return;
  estado.moduloSelecionado = id;
  salvar();
  renderModulos();
  renderModuloSelecionado();
  atualizarTudo();
}

let timerDiagnostico = null;
function renderModuloSelecionado() {
  const id = estado.moduloSelecionado;
  const cfg = MODULOS[id];
  if (!cfg) return;
  document.getElementById('modNome').textContent = `${cfg.icone} ${cfg.nome}`;
  document.getElementById('modDesc').textContent = cfg.desc;
  document.getElementById('dicaModulo').textContent = cfg.dica;
  const atual = estado.modulos[id] || {};
  document.getElementById('modX').value = atual.x ?? cfg.x;
  document.getElementById('modZ').value = atual.z ?? cfg.z;
  document.getElementById('modRot').value = atual.rot ?? 0;
  document.getElementById('lblModX').textContent = metros(atual.x ?? cfg.x, 1);
  document.getElementById('lblModZ').textContent = metros(atual.z ?? cfg.z, 1);
  document.getElementById('lblModRot').textContent = `${atual.rot ?? 0}°`;

  clearTimeout(timerDiagnostico);
  timerDiagnostico = setTimeout(() => {
    const diag = mundo.diagnosticarModulo(id);
    if (!diag) return;
    document.getElementById('modSol').textContent = `${diag.horas} h/dia`;
    document.getElementById('modSolTarde').textContent = `${diag.horasTarde} h`;
    const el = document.getElementById('modAlerta');
    if (diag.alerta) {
      el.className = 'alerta';
      el.textContent = `⚠️ ${diag.alerta}`;
    } else {
      el.className = 'alerta ok';
      el.textContent = '✅ Microclima compatível com o módulo.';
    }
  }, 60);
}

elListaModulos.addEventListener('click', (e) => {
  const caixa = e.target.closest('input[type="checkbox"]');
  if (caixa) {
    const linha = caixa.closest('[data-modulo]');
    estado.modulos[linha.dataset.modulo].visivel = caixa.checked;
    salvar();
    renderModulos();
    atualizarTudo();
    return;
  }
  const linha = e.target.closest('[data-modulo]');
  if (linha) selecionarModulo(linha.dataset.modulo);
});

elListaModulos.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const linha = e.target.closest('[data-modulo]');
  if (!linha) return;
  e.preventDefault();
  selecionarModulo(linha.dataset.modulo);
});

['modX', 'modZ', 'modRot'].forEach((id) => {
  document.getElementById(id).addEventListener('input', () => {
    const mod = estado.modulos[estado.moduloSelecionado];
    if (!mod) return;
    mod.x = Number(document.getElementById('modX').value);
    mod.z = Number(document.getElementById('modZ').value);
    mod.rot = Number(document.getElementById('modRot').value);
    document.getElementById('lblModX').textContent = metros(mod.x, 1);
    document.getElementById('lblModZ').textContent = metros(mod.z, 1);
    document.getElementById('lblModRot').textContent = `${mod.rot}°`;
    atualizarTudo();
    salvar();
    clearTimeout(timerDiagnostico);
    timerDiagnostico = setTimeout(() => {
      const diag = mundo.diagnosticarModulo(estado.moduloSelecionado);
      if (!diag) return;
      document.getElementById('modSol').textContent = `${diag.horas} h/dia`;
      document.getElementById('modSolTarde').textContent = `${diag.horasTarde} h`;
    }, 120);
  });
});

// ============================ SCAN ============================
const inputScan = document.getElementById('inputScan');
const controlesScan = document.getElementById('controlesScan');

inputScan.addEventListener('change', async (e) => {
  const arquivo = e.target.files?.[0];
  if (!arquivo) return;
  mostrarToast('Carregando scan 3D…');
  try {
    const info = await mundo.carregarScan(arquivo);
    controlesScan.hidden = false;
    document.getElementById('scanNome').textContent = `${info.nome} · ${info.dimensoes === 'nuvem de pontos' ? 'nuvem de pontos' : 'malha'}`;
    document.getElementById('scanEscala').value = info.escalaSugerida;
    document.getElementById('scanRot').value = 0;
    document.getElementById('scanX').value = 0;
    document.getElementById('scanY').value = 0;
    document.getElementById('scanZ').value = 0;
    aplicarScan();
    mostrarToast('Scan carregado. Ajuste escala, rotação e posição.');
  } catch (erro) {
    mostrarToast(`Não consegui abrir o arquivo: ${erro.message}`);
  }
  e.target.value = '';
});

function aplicarScan() {
  const dados = {
    escala: Number(document.getElementById('scanEscala').value) || 1,
    rot: Number(document.getElementById('scanRot').value) || 0,
    x: Number(document.getElementById('scanX').value) || 0,
    y: Number(document.getElementById('scanY').value) || 0,
    z: Number(document.getElementById('scanZ').value) || 0,
  };
  mundo.aplicarTransformacaoScan(dados);
  document.getElementById('lblScanEscala').textContent = `${dados.escala.toFixed(2).replace('.', ',')}×`;
  document.getElementById('lblScanRot').textContent = `${dados.rot}°`;
}

['scanEscala', 'scanRot', 'scanX', 'scanY', 'scanZ'].forEach((id) =>
  document.getElementById(id).addEventListener('input', aplicarScan)
);

document.getElementById('btnRemoverScan').addEventListener('click', () => {
  if (mundo.removerScan()) {
    controlesScan.hidden = true;
    mostrarToast('Scan removido da cena.');
  }
});

// ============================ BACKUP / RESET ============================
function exportarJson() {
  const dados = {
    app: 'maracaju3d',
    versao: VERSAO,
    exportadoEm: new Date().toISOString(),
    estado,
  };
  baixarArquivo(`maracaju-88-${new Date().toISOString().slice(0, 10)}.json`, new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' }));
  mostrarToast('Backup baixado. Guarde no WhatsApp ou no Drive para levar a outro aparelho.');
}

function exportarModelo() {
  const dados = {
    ...casa,
    atualizadoEm: new Date().toISOString(),
  };
  baixarArquivo(
    `maracaju-88-planta-${new Date().toISOString().slice(0, 10)}.json`,
    new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' })
  );
  mostrarToast('Planta baixada em JSON. Edite as medidas e importe de volta.');
}

async function importarModelo(arquivo) {
  try {
    const bruto = JSON.parse(await arquivo.text());
    const nova = normalizarCasa(bruto.casa || bruto);
    if (!nova.rooms.length) throw new Error('sem cômodos');
    if (!confirm('Substituir a planta atual por esta? As medidas atuais serão perdidas (o backup JSON continua valendo).')) return;
    Object.assign(casa, nova);
    casa.origem = bruto.origem || 'importado';
    casa.fonte = bruto.fonte || arquivo.name;
    casa.atualizadoEm = new Date().toISOString();
    estado.casa = casa;
    if (!casa.rooms.some((r) => r.id === estado.comodoSelecionado)) estado.comodoSelecionado = casa.rooms[0].id;
    mundo.definirCasa(casa);
    sincronizarTudo();
    persistirAgora();
    mostrarToast(`Planta importada: ${casa.rooms.length} cômodos.`);
  } catch {
    mostrarToast('JSON de planta inválido. Use um arquivo gerado/validado pelo app.');
  }
}

async function carregarModeloDoProjeto() {
  const nova = await lerCasaDoProjeto();
  if (!nova) {
    mostrarToast('app/data/casa.json não encontrado ou inválido.');
    return;
  }
  if (!confirm('Carregar a planta de app/data/casa.json? As medições feitas aqui neste aparelho serão substituídas.')) return;
  Object.assign(casa, nova);
  estado.casa = casa;
  if (!casa.rooms.some((r) => r.id === estado.comodoSelecionado)) estado.comodoSelecionado = casa.rooms[0].id;
  mundo.definirCasa(casa);
  sincronizarTudo();
  persistirAgora();
  mostrarToast('Planta do projeto carregada.');
}

async function importarJson(arquivo) {
  try {
    const cru = JSON.parse(await arquivo.text());
    const dados = cru.estado || cru;
    const normalizado = normalizarCasa(dados.casa);
    const novo = {
      ...estadoPadrao(),
      ...dados,
      modulos: { ...modulosPadrao(), ...(dados.modulos || {}) },
      casa: normalizado,
    };
    for (const chave of Object.keys(estado)) delete estado[chave];
    Object.assign(estado, novo);
    Object.assign(casa, normalizado);
    estado.casa = casa;

    if (!casa.rooms.some((r) => r.id === estado.comodoSelecionado)) estado.comodoSelecionado = casa.rooms[0]?.id;
    if (!MODULOS[estado.moduloSelecionado]) estado.moduloSelecionado = 'horta_15m';
    if (!['casa3d', 'interiores', 'captura', 'levantamento'].includes(estado.aba)) estado.aba = 'casa3d';
    if (!['3d', 'planta', 'passeio'].includes(estado.modo)) estado.modo = '3d';

    mundo.definirCasa(casa);
    sincronizarTudo();
    persistirAgora();
    mostrarToast(`Backup restaurado: ${casa.rooms.length} cômodos.`);
  } catch {
    mostrarToast('Arquivo inválido. Use um backup gerado por este app.');
  }
}

function resetar() {
  const padrao = estadoPadrao();
  for (const chave of Object.keys(estado)) delete estado[chave];
  Object.assign(estado, padrao, { casa });
  Object.assign(casa, padrao.casa);
  mundo.definirCasa(casa);
  sincronizarTudo();
  persistirAgora();
  mostrarToast('Planta estimada restaurada. As fotos capturadas continuam na aba Captura.');
}

// ============================ ATUALIZAÇÃO GERAL ============================
function atualizarTudo() {
  mundo.atualizarTudo();
  atualizarProgresso();
}

function sincronizarTudo() {
  sincronizarControlesSol();
  sincronizarTerreno();
  document.getElementById('selectCobertura').value = estado.coberturaFundos;
  renderModulos();
  renderModuloSelecionado();
  interiores.renderTudo();
  interiores.atualizarSol();
  captura.atualizarTudo();
  levantamento.renderTudo();
  atualizarProgresso();
  irParaAba(estado.aba);
}

function aplicarCasa() {
  mundo.definirCasa(casa);
  atualizarTudo();
  salvar();
  interiores.renderTudo();
  levantamento.renderTudo();
}

function irParaComodo(id) {
  if (!id || !casa.rooms.some((r) => r.id === id)) return;
  estado.comodoSelecionado = id;
  if (estado.aba !== 'interiores') {
    estado.modo = '3d';
    irParaAba('interiores');
  }
  interiores.selecionar(id, true);
  salvar();
}

// ============================ AJUDA E DICAS ============================
const modalAjuda = document.getElementById('modalAjuda');
document.getElementById('btnAjuda').addEventListener('click', () => (modalAjuda.hidden = false));
document.getElementById('btnFecharAjuda').addEventListener('click', () => (modalAjuda.hidden = true));
modalAjuda.addEventListener('click', (e) => {
  if (e.target === modalAjuda) modalAjuda.hidden = true;
});
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !modalAjuda.hidden) modalAjuda.hidden = true;
});

const cardComece = document.getElementById('cardComece');
if (localStorage.getItem(CHAVE_DICAS) === 'oculto') cardComece.hidden = true;
document.getElementById('btnFecharDicas').addEventListener('click', () => {
  localStorage.setItem(CHAVE_DICAS, 'oculto');
  cardComece.hidden = true;
});

// ============================ BOOT ============================
document.getElementById('btnSalvar').addEventListener('click', () => {
  persistirAgora();
  mostrarToast('Salvo neste dispositivo. Use Backup na aba Dados para levar a outro aparelho.');
});
document.getElementById('pillProgresso').addEventListener('click', () => irParaAba('levantamento'));

document.addEventListener('click', (e) => {
  const raiox = e.target.closest('#btnRaioX');
  if (raiox) raiox.blur();
});

// checkboxes de visualização que existem no HTML
const checkMobilia = document.getElementById('checkMobilia');
const checkEtiquetas = document.getElementById('checkEtiquetas');
if (checkMobilia) checkMobilia.checked = estado.mobilia !== false;
if (checkEtiquetas) checkEtiquetas.checked = estado.etiquetas !== false;

sincronizarControlesSol();
sincronizarTerreno();
renderModulos();
renderModuloSelecionado();
sincronizarTudo();
mundo.aplicarPreset(estado.aba === 'interiores' ? 'casa' : 'geral');
mundo.resize();

const observador = new ResizeObserver(() => {
  mundo.resize();
});
observador.observe(palcoCasa);
observador.observe(palcoInterior);

mundo.iniciarLoop((dt) => {
  interiores.aoFrame(dt);
  if (animando) {
    estado.hora += dt * 1.15;
    if (estado.hora > 18.5) estado.hora = 5.5;
    document.querySelectorAll('[data-sol="hora"]').forEach((el) => (el.value = String(estado.hora)));
    document.querySelectorAll('[data-sol="hora-label"]').forEach((el) => {
      el.textContent = `${String(Math.floor(estado.hora)).padStart(2, '0')}:${String(Math.round((estado.hora % 1) * 60)).padStart(2, '0')}`;
    });
    mundo.atualizarTudo();
  }
});

if (migradoDeV1) {
  mostrarToast('Seu cenário anterior foi migrado. Confira as medidas na aba Interiores.');
}
setTimeout(() => {
  if (!localStorage.getItem(CHAVE_DICAS)) {
    // primeira visita: deixa a dica visível, sem pop-up chato
  }
}, 400);
