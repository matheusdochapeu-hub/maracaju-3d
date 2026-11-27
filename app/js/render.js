/**
 * render.js — Controlador da aba "🎨 Render" (texturas em camadas + fotos reais + reforma).
 *
 * Permite personalizar cômodo a cômodo e item por item:
 *   - Piso do cômodo (`piso:<roomId>`)
 *   - Paredes do cômodo (`parede:<roomId>`)
 *   - Cada móvel ou eletrodoméstico individualmente (`movel:<movelId>`)
 *
 * Aceita texturas PBR embutidas (offline), fotos tiradas na hora com o celular,
 * imagens da galeria, links de pesquisa na internet e URL direta de textura.
 */

import {
  ACABAMENTOS,
  CATALOGO_TEXTURAS,
  SUGESTOES_REFORMA,
  buscarTexturas,
  comprimirFotoParaTextura,
  desenharTexturaProcedural,
  linksPesquisaTextura,
  texturaPorId,
} from './texturas.js';
import { baixarArquivo, escaparHtml } from './utils.js';

const CACHE_MINIATURAS = new Map();

function miniaturaTextura(spec) {
  if (!spec) return '';
  if (CACHE_MINIATURAS.has(spec.id)) return CACHE_MINIATURAS.get(spec.id);
  try {
    const url = desenharTexturaProcedural(spec, 72).toDataURL('image/png');
    CACHE_MINIATURAS.set(spec.id, url);
    return url;
  } catch {
    return '';
  }
}

function nomeMaterialAplicado(mat) {
  if (!mat) return 'Padrão automático';
  if (mat.fotoUrl) return mat.rotulo || '📷 Foto / imagem aplicada';
  const spec = mat.texturaId ? texturaPorId(mat.texturaId) : null;
  return mat.rotulo || spec?.nome || 'Personalizado';
}

export function iniciarRender({ estado, casa, mundo, salvar, atualizarTudo, toast, sincronizarInteriores }) {
  const elComodoSelect = document.getElementById('renderComodoSelect');
  const elCamadas = document.getElementById('renderCamadas');
  const elWrapMovel = document.getElementById('wrapRenderMovel');
  const elMovelSelect = document.getElementById('renderMovelSelect');
  const elSemMovelAviso = document.getElementById('renderSemMovelAviso');
  const elAtualInfo = document.getElementById('renderAtualInfo');
  const elBtnResetCamada = document.getElementById('btnRenderResetCamada');

  const elInputCamera = document.getElementById('inputRenderCamera');
  const elInputGaleria = document.getElementById('inputRenderGaleria');
  const elBuscaWeb = document.getElementById('buscaWebTextura');
  const elLinksWeb = document.getElementById('linksWebTextura');
  const elInputUrl = document.getElementById('inputRenderUrl');
  const elBtnAplicarUrl = document.getElementById('btnAplicarRenderUrl');

  const elRep = document.getElementById('renderRep');
  const elLblRep = document.getElementById('lblRenderRep');
  const elAcabamento = document.getElementById('renderAcabamento');

  const elBuscaTex = document.getElementById('buscaTexturaRender');
  const elGradeTex = document.getElementById('gradeTexturasRender');
  const elContadorTex = document.getElementById('contadorTexturasRender');

  const elResumoCamadas = document.getElementById('resumoCamadasRender');
  const elBtnLimparComodo = document.getElementById('btnRenderLimparComodo');
  const elListaSugestoes = document.getElementById('listaSugestoesReforma');

  // HUD do palco
  const elLuzBtns = document.querySelectorAll('[data-luz-render]');
  const elBtnDentro = document.getElementById('btnRenderDentro');
  const elBtn34 = document.getElementById('btnRender34');
  const elBtnCasaToda = document.getElementById('btnRenderCasaToda');
  const elBtnIsolar = document.getElementById('btnRenderIsolar');
  const elBtnParedes = document.getElementById('btnRenderParedes');
  const elBtnMarcarAntes = document.getElementById('btnRenderMarcarAntes');
  const elBtnComparar = document.getElementById('btnRenderComparar');
  const elBtnBaixarPng = document.getElementById('btnRenderBaixarPng');

  // Modal Antes × Depois
  const elModalComparar = document.getElementById('modalCompararRender');
  const elBtnFecharComparar = document.getElementById('btnFecharComparar');
  const elImgAntes = document.getElementById('imgRenderAntes');
  const elImgDepois = document.getElementById('imgRenderDepois');
  const elCompararNota = document.getElementById('compararRenderNota');
  const elBtnBaixarDepois = document.getElementById('btnBaixarRenderDepois');

  let camadaAtiva = 'piso'; // 'piso' | 'parede' | 'movel'
  let termoBuscaTex = '';
  let snapshotAntes = null;
  let snapshotAntesComodo = null;

  function garantirMateriais() {
    if (!casa.materiais || typeof casa.materiais !== 'object') casa.materiais = {};
    return casa.materiais;
  }

  function comodoAtual() {
    return casa.rooms.find((r) => r.id === estado.comodoSelecionado) || casa.rooms[0] || null;
  }

  function moveisDoComodo(comodoId) {
    return (casa.moveis || []).filter((m) => m.comodoId === comodoId);
  }

  function movelAlvoAtual() {
    const r = comodoAtual();
    if (!r) return null;
    const lista = moveisDoComodo(r.id);
    if (!lista.length) return null;
    const sel = lista.find((m) => m.id === estado.movelSelecionado);
    if (sel) return sel;
    estado.movelSelecionado = lista[0].id;
    return lista[0];
  }

  function chaveAlvoAtual() {
    const r = comodoAtual();
    if (!r) return null;
    if (camadaAtiva === 'piso') return `piso:${r.id}`;
    if (camadaAtiva === 'parede') return `parede:${r.id}`;
    const mov = movelAlvoAtual();
    return mov ? `movel:${mov.id}` : null;
  }

  function aplicarMudancaVisual(somenteMoveis = false) {
    if (somenteMoveis) {
      mundo.atualizarMoveis(casa);
    } else {
      mundo.definirCasa(casa);
    }
    atualizarTudo();
    salvar();
    renderStatusEControles();
    renderResumoCamadas();
    renderGradeTexturas();
  }

  function salvarAntesSilenciosoSeVazio() {
    if (snapshotAntes) return;
    const r = comodoAtual();
    const url = mundo.capturarRenderDataUrl?.();
    if (url) {
      snapshotAntes = url;
      snapshotAntesComodo = r?.nome || 'Cômodo';
      sincronizarHud();
    }
  }

  function definirMaterial(chave, specMaterial, somenteMoveis = false) {
    if (!chave) return;
    salvarAntesSilenciosoSeVazio();
    const mats = garantirMateriais();
    if (!specMaterial) {
      delete mats[chave];
    } else {
      mats[chave] = {
        texturaId: specMaterial.texturaId || null,
        fotoUrl: specMaterial.fotoUrl || null,
        rep: Math.min(10, Math.max(0.5, Number(specMaterial.rep) || 3)),
        acabamento: ACABAMENTOS[specMaterial.acabamento] ? specMaterial.acabamento : 'acetinado',
        rotulo: String(specMaterial.rotulo || '').slice(0, 60),
      };
    }
    aplicarMudancaVisual(somenteMoveis);
  }

  // ===================== RENDERS DE UI =====================

  function renderSelectComodos() {
    if (!elComodoSelect) return;
    const atual = comodoAtual();
    elComodoSelect.innerHTML = casa.rooms
      .map((r) => `<option value="${r.id}" ${r.id === atual?.id ? 'selected' : ''}>${escaparHtml(r.nome)}</option>`)
      .join('');
  }

  function renderSelectMoveis() {
    if (!elWrapMovel || !elMovelSelect) return;
    const mostrar = camadaAtiva === 'movel';
    elWrapMovel.hidden = !mostrar;
    if (!mostrar) return;

    const r = comodoAtual();
    const lista = r ? moveisDoComodo(r.id) : [];
    if (!lista.length) {
      elMovelSelect.hidden = true;
      if (elSemMovelAviso) elSemMovelAviso.hidden = false;
      return;
    }
    elMovelSelect.hidden = false;
    if (elSemMovelAviso) elSemMovelAviso.hidden = true;
    const ativo = movelAlvoAtual();
    elMovelSelect.innerHTML = lista
      .map((m) => `<option value="${m.id}" ${m.id === ativo?.id ? 'selected' : ''}>${escaparHtml(m.nome)}</option>`)
      .join('');
  }

  function renderStatusEControles() {
    const chave = chaveAlvoAtual();
    const mats = garantirMateriais();
    const mat = chave ? mats[chave] : null;
    const r = comodoAtual();
    const mov = camadaAtiva === 'movel' ? movelAlvoAtual() : null;

    const alvoTexto =
      camadaAtiva === 'piso'
        ? `Piso · ${r?.nome || '—'}`
        : camadaAtiva === 'parede'
        ? `Paredes · ${r?.nome || '—'}`
        : mov
        ? `Móvel · ${mov.nome}`
        : 'Nenhum móvel neste cômodo';

    if (elAtualInfo) {
      elAtualInfo.innerHTML = `
        <div class="render-alvo-titulo">${escaparHtml(alvoTexto)}</div>
        <div class="render-alvo-mat">${escaparHtml(nomeMaterialAplicado(mat))}</div>
      `;
    }
    if (elBtnResetCamada) {
      elBtnResetCamada.disabled = !mat;
    }

    const repVal = mat?.rep ?? (camadaAtiva === 'movel' ? 2 : 3);
    if (elRep) elRep.value = String(repVal);
    if (elLblRep) elLblRep.textContent = `${Number(repVal).toFixed(1).replace('.', ',')}×`;
    if (elAcabamento) {
      const spec = mat?.texturaId ? texturaPorId(mat.texturaId) : null;
      elAcabamento.value = mat?.acabamento || spec?.acabamento || (camadaAtiva === 'parede' ? 'fosco' : 'acetinado');
    }

    elCamadas?.querySelectorAll('[data-camada]').forEach((btn) => {
      btn.classList.toggle('ativo', btn.dataset.camada === camadaAtiva);
    });
  }

  function renderLinksWeb() {
    if (!elLinksWeb) return;
    const termo = elBuscaWeb?.value || '';
    const links = linksPesquisaTextura(termo, camadaAtiva);
    elLinksWeb.innerHTML = `
      <a class="chip" href="${links.google}" target="_blank" rel="noopener noreferrer">🔍 Google Imagens</a>
      <a class="chip" href="${links.polyhaven}" target="_blank" rel="noopener noreferrer">🧱 Poly Haven</a>
      <a class="chip" href="${links.ambientcg}" target="_blank" rel="noopener noreferrer">🎨 AmbientCG</a>
      <a class="chip" href="${links.unsplash}" target="_blank" rel="noopener noreferrer">📷 Unsplash</a>
    `;
  }

  function renderGradeTexturas() {
    if (!elGradeTex) return;
    const lista = buscarTexturas(camadaAtiva, termoBuscaTex);
    if (elContadorTex) elContadorTex.textContent = `${lista.length}`;

    const chave = chaveAlvoAtual();
    const matAtual = chave ? garantirMateriais()[chave] : null;

    if (!lista.length) {
      elGradeTex.innerHTML = `<p class="ajuda" style="grid-column:1/-1">Nenhuma textura encontrada para "${escaparHtml(termoBuscaTex)}". Use a busca na internet acima ou envie uma foto!</p>`;
      return;
    }

    elGradeTex.innerHTML = lista
      .map((spec) => {
        const ativo = matAtual && !matAtual.fotoUrl && matAtual.texturaId === spec.id;
        const thumb = miniaturaTextura(spec);
        return `
          <button type="button" class="swatch-tex ${ativo ? 'ativo' : ''}" data-tex-id="${spec.id}" title="${escaparHtml(spec.nome)}">
            <span class="swatch-img" style="background-color:${spec.cor1};${thumb ? `background-image:url('${thumb}')` : ''}"></span>
            <span class="swatch-nome">${escaparHtml(spec.nome)}</span>
          </button>
        `;
      })
      .join('');
  }

  function renderResumoCamadas() {
    if (!elResumoCamadas) return;
    const r = comodoAtual();
    if (!r) {
      elResumoCamadas.innerHTML = '<p class="ajuda">Selecione um cômodo.</p>';
      return;
    }
    const mats = garantirMateriais();
    const itens = [
      { tipo: 'piso', chave: `piso:${r.id}`, icone: '🟫', titulo: 'Piso', movelId: null },
      { tipo: 'parede', chave: `parede:${r.id}`, icone: '🧱', titulo: 'Paredes', movelId: null },
      ...moveisDoComodo(r.id).map((m) => ({
        tipo: 'movel',
        chave: `movel:${m.id}`,
        icone: '🪑',
        titulo: m.nome,
        movelId: m.id,
      })),
    ];

    const customCount = itens.filter((i) => Boolean(mats[i.chave])).length;
    if (elBtnLimparComodo) elBtnLimparComodo.disabled = customCount === 0;

    elResumoCamadas.innerHTML = itens
      .map((item) => {
        const mat = mats[item.chave];
        const selecionado =
          camadaAtiva === item.tipo && (item.tipo !== 'movel' || estado.movelSelecionado === item.movelId);
        const badge = mat ? (mat.fotoUrl ? '📷 Foto' : '✨ Custom') : 'Padrão';
        return `
          <div class="resumo-camada ${selecionado ? 'ativo' : ''}" data-sel-tipo="${item.tipo}" data-sel-movel="${item.movelId || ''}">
            <div class="texto">
              <div class="nome">${item.icone} ${escaparHtml(item.titulo)} <span class="badge-camada ${mat ? 'custom' : ''}">${badge}</span></div>
              <div class="sub">${escaparHtml(nomeMaterialAplicado(mat))}</div>
            </div>
            ${mat ? `<button type="button" class="btn sm icone" data-reset-chave="${item.chave}" title="Voltar ao padrão">↺</button>` : ''}
          </div>
        `;
      })
      .join('');
  }

  function renderSugestoesReforma() {
    if (!elListaSugestoes) return;
    elListaSugestoes.innerHTML = SUGESTOES_REFORMA.map((sug) => {
      const tPiso = texturaPorId(sug.piso);
      const tPar = texturaPorId(sug.parede);
      const tMov = texturaPorId(sug.movelSugerido);
      return `
        <div class="sugestao-card">
          <div class="sugestao-topo">
            <b>${escaparHtml(sug.nome)}</b>
            <span class="sugestao-bolinhas" aria-hidden="true">
              <i style="background:${tPiso?.cor1 || '#ccc'}" title="Piso"></i>
              <i style="background:${tPar?.cor1 || '#eee'}" title="Parede"></i>
              <i style="background:${tMov?.cor1 || '#999'}" title="Móvel"></i>
            </span>
          </div>
          <p class="ajuda">${escaparHtml(sug.desc)}</p>
          <button type="button" class="btn sm full" data-aplicar-sugestao="${sug.id}">✨ Aplicar neste cômodo</button>
        </div>
      `;
    }).join('');
  }

  function sincronizarHud() {
    const luz = estado.luzRender || 'dia';
    elLuzBtns.forEach((btn) => {
      btn.classList.toggle('ativo', btn.dataset.luzRender === luz);
    });
    if (elBtnIsolar) {
      elBtnIsolar.textContent = estado.isolarComodo ? '✓ Só este cômodo' : '🔍 Só este cômodo';
      elBtnIsolar.classList.toggle('ativo', Boolean(estado.isolarComodo));
    }
    if (elBtnParedes) {
      const mp = estado.modoParedes || 'inteiras';
      elBtnParedes.textContent = mp === 'baixas' ? '🧱 Paredes baixas' : mp === 'sem' ? '🚫 Sem paredes' : '🧱 Paredes inteiras';
      elBtnParedes.classList.toggle('ativo', mp !== 'inteiras');
    }
    if (elBtnComparar) {
      elBtnComparar.disabled = !snapshotAntes;
      elBtnComparar.title = snapshotAntes
        ? `Comparar com o "Antes" de ${snapshotAntesComodo || 'cômodo'}`
        : 'Clique em "Salvar Antes" ou aplique uma textura primeiro';
    }
  }

  function renderTudo() {
    renderSelectComodos();
    renderSelectMoveis();
    renderStatusEControles();
    renderLinksWeb();
    renderGradeTexturas();
    renderResumoCamadas();
    renderSugestoesReforma();
    sincronizarHud();
  }

  // ===================== EVENTOS =====================

  elComodoSelect?.addEventListener('change', () => {
    estado.comodoSelecionado = elComodoSelect.value;
    const lista = moveisDoComodo(estado.comodoSelecionado);
    estado.movelSelecionado = lista[0]?.id || null;
    salvar();
    atualizarTudo();
    sincronizarInteriores?.();
    renderTudo();
    mundo.focarComodo(estado.comodoSelecionado);
  });

  elCamadas?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-camada]');
    if (!btn) return;
    camadaAtiva = btn.dataset.camada;
    renderSelectMoveis();
    renderStatusEControles();
    renderLinksWeb();
    renderGradeTexturas();
    renderResumoCamadas();
  });

  elMovelSelect?.addEventListener('change', () => {
    estado.movelSelecionado = elMovelSelect.value;
    salvar();
    atualizarTudo();
    renderStatusEControles();
    renderGradeTexturas();
    renderResumoCamadas();
  });

  elBtnResetCamada?.addEventListener('click', () => {
    const chave = chaveAlvoAtual();
    if (!chave) return;
    definirMaterial(chave, null, camadaAtiva === 'movel');
    toast('Textura restaurada para o padrão.');
  });

  async function processarArquivoFoto(arquivo, origem = 'Foto') {
    if (!arquivo) return;
    const chave = chaveAlvoAtual();
    if (!chave) {
      toast('Selecione um cômodo ou móvel primeiro.');
      return;
    }
    try {
      toast('Aplicando textura da foto…');
      const dataUrl = await comprimirFotoParaTextura(arquivo, 512);
      const mats = garantirMateriais();
      const atual = mats[chave];
      const nomeArq = (arquivo.name || '').replace(/\.[^.]+$/, '').slice(0, 32);
      definirMaterial(
        chave,
        {
          fotoUrl: dataUrl,
          texturaId: null,
          rep: atual?.rep ?? (camadaAtiva === 'movel' ? 1 : 2),
          acabamento: elAcabamento?.value || atual?.acabamento || 'acetinado',
          rotulo: nomeArq ? `📷 ${nomeArq}` : `📷 ${origem}`,
        },
        camadaAtiva === 'movel'
      );
      toast('Foto aplicada como textura 3D!');
    } catch (erro) {
      toast(erro.message || 'Não foi possível ler essa imagem.');
    }
  }

  elInputCamera?.addEventListener('change', async (e) => {
    await processarArquivoFoto(e.target.files?.[0], 'Foto da câmera');
    e.target.value = '';
  });

  elInputGaleria?.addEventListener('change', async (e) => {
    await processarArquivoFoto(e.target.files?.[0], 'Imagem da galeria');
    e.target.value = '';
  });

  elBuscaWeb?.addEventListener('input', () => renderLinksWeb());

  elBtnAplicarUrl?.addEventListener('click', () => {
    const url = (elInputUrl?.value || '').trim();
    if (!url || !/^(https?:\/\/|data:image\/)/i.test(url)) {
      toast('Cole um link direto de imagem começando com https://');
      return;
    }
    const chave = chaveAlvoAtual();
    if (!chave) {
      toast('Selecione um cômodo ou móvel primeiro.');
      return;
    }
    const atual = garantirMateriais()[chave];
    definirMaterial(
      chave,
      {
        fotoUrl: url,
        texturaId: null,
        rep: atual?.rep ?? (camadaAtiva === 'movel' ? 1 : 2),
        acabamento: elAcabamento?.value || atual?.acabamento || 'acetinado',
        rotulo: '🌐 Imagem da internet',
      },
      camadaAtiva === 'movel'
    );
    if (elInputUrl) elInputUrl.value = '';
    toast('Textura da internet aplicada! (Se o site bloquear CORS, baixe a foto e envie pela Galeria.)');
  });

  elRep?.addEventListener('input', () => {
    const val = Number(elRep.value) || 3;
    if (elLblRep) elLblRep.textContent = `${val.toFixed(1).replace('.', ',')}×`;
    const chave = chaveAlvoAtual();
    if (!chave) return;
    const mats = garantirMateriais();
    if (!mats[chave]) return;
    mats[chave].rep = val;
    aplicarMudancaVisual(camadaAtiva === 'movel');
  });

  elAcabamento?.addEventListener('change', () => {
    const chave = chaveAlvoAtual();
    if (!chave) return;
    const mats = garantirMateriais();
    if (!mats[chave]) return;
    mats[chave].acabamento = elAcabamento.value;
    aplicarMudancaVisual(camadaAtiva === 'movel');
  });

  elBuscaTex?.addEventListener('input', () => {
    termoBuscaTex = elBuscaTex.value || '';
    renderGradeTexturas();
  });

  elGradeTex?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tex-id]');
    if (!btn) return;
    const spec = texturaPorId(btn.dataset.texId);
    const chave = chaveAlvoAtual();
    if (!spec || !chave) {
      toast('Selecione um móvel ou cômodo primeiro.');
      return;
    }
    definirMaterial(
      chave,
      {
        texturaId: spec.id,
        fotoUrl: null,
        rep: spec.rep,
        acabamento: spec.acabamento,
        rotulo: spec.nome,
      },
      camadaAtiva === 'movel'
    );
    toast(`Aplicado: ${spec.nome}`);
  });

  elResumoCamadas?.addEventListener('click', (e) => {
    const btnReset = e.target.closest('[data-reset-chave]');
    if (btnReset) {
      const chave = btnReset.dataset.resetChave;
      definirMaterial(chave, null, chave.startsWith('movel:'));
      toast('Item voltou ao padrão.');
      return;
    }
    const linha = e.target.closest('[data-sel-tipo]');
    if (!linha) return;
    camadaAtiva = linha.dataset.selTipo;
    if (camadaAtiva === 'movel' && linha.dataset.selMovel) {
      estado.movelSelecionado = linha.dataset.selMovel;
    }
    renderSelectMoveis();
    renderStatusEControles();
    renderLinksWeb();
    renderGradeTexturas();
    renderResumoCamadas();
  });

  elBtnLimparComodo?.addEventListener('click', () => {
    const r = comodoAtual();
    if (!r) return;
    const mats = garantirMateriais();
    delete mats[`piso:${r.id}`];
    delete mats[`parede:${r.id}`];
    for (const m of moveisDoComodo(r.id)) delete mats[`movel:${m.id}`];
    aplicarMudancaVisual(false);
    toast(`Texturas de ${r.nome} restauradas ao padrão.`);
  });

  elListaSugestoes?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-aplicar-sugestao]');
    if (!btn) return;
    const sug = SUGESTOES_REFORMA.find((s) => s.id === btn.dataset.aplicarSugestao);
    const r = comodoAtual();
    if (!sug || !r) return;

    salvarAntesSilenciosoSeVazio();
    const mats = garantirMateriais();
    const tPiso = texturaPorId(sug.piso);
    const tPar = texturaPorId(sug.parede);
    if (tPiso) {
      mats[`piso:${r.id}`] = {
        texturaId: tPiso.id,
        fotoUrl: null,
        rep: tPiso.rep,
        acabamento: tPiso.acabamento,
        rotulo: tPiso.nome,
      };
    }
    if (tPar) {
      mats[`parede:${r.id}`] = {
        texturaId: tPar.id,
        fotoUrl: null,
        rep: tPar.rep,
        acabamento: tPar.acabamento,
        rotulo: tPar.nome,
      };
    }
    aplicarMudancaVisual(false);
    toast(`Reforma "${sug.nome}" aplicada em ${r.nome}! Clique em "Antes × Depois" para comparar.`);
  });

  // HUD iluminação e câmeras
  elLuzBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      estado.luzRender = btn.dataset.luzRender;
      salvar();
      atualizarTudo();
      sincronizarHud();
    });
  });

  elBtnDentro?.addEventListener('click', () => {
    const r = comodoAtual();
    if (!r) return;
    mundo.focarDentroComodo(r.id);
    toast(`Câmera dentro de ${r.nome} (altura dos olhos). Arraste para olhar ao redor.`);
  });

  elBtn34?.addEventListener('click', () => {
    const r = comodoAtual();
    if (r) mundo.focarComodo(r.id);
  });

  elBtnCasaToda?.addEventListener('click', () => {
    estado.isolarComodo = false;
    salvar();
    atualizarTudo();
    sincronizarInteriores?.();
    sincronizarHud();
    mundo.aplicarPreset('casa');
  });

  elBtnIsolar?.addEventListener('click', () => {
    estado.isolarComodo = !estado.isolarComodo;
    salvar();
    atualizarTudo();
    sincronizarInteriores?.();
    sincronizarHud();
    if (estado.isolarComodo && estado.comodoSelecionado) {
      mundo.focarComodo(estado.comodoSelecionado);
    }
  });

  elBtnParedes?.addEventListener('click', () => {
    const ordem = ['inteiras', 'baixas', 'sem'];
    const idx = ordem.indexOf(estado.modoParedes || 'inteiras');
    estado.modoParedes = ordem[(idx + 1) % ordem.length];
    salvar();
    atualizarTudo();
    sincronizarInteriores?.();
    sincronizarHud();
  });

  elBtnMarcarAntes?.addEventListener('click', () => {
    const url = mundo.capturarRenderDataUrl?.();
    if (!url) {
      toast('Não foi possível capturar o render agora.');
      return;
    }
    snapshotAntes = url;
    snapshotAntesComodo = comodoAtual()?.nome || 'Casa';
    sincronizarHud();
    toast(`Estado "Antes" salvo (${snapshotAntesComodo}). Agora teste texturas e clique em "Antes × Depois"!`);
  });

  function abrirModalComparar() {
    if (!snapshotAntes) {
      toast('Clique em "Salvar Antes" primeiro para comparar.');
      return;
    }
    const depoisUrl = mundo.capturarRenderDataUrl?.();
    if (!depoisUrl) return;
    if (elImgAntes) elImgAntes.src = snapshotAntes;
    if (elImgDepois) elImgDepois.src = depoisUrl;
    if (elCompararNota) {
      elCompararNota.textContent = `Comparando ${snapshotAntesComodo || 'Antes'} com o estado atual de ${comodoAtual()?.nome || 'Casa'}.`;
    }
    if (elModalComparar) elModalComparar.hidden = false;
  }

  elBtnComparar?.addEventListener('click', abrirModalComparar);
  elBtnFecharComparar?.addEventListener('click', () => {
    if (elModalComparar) elModalComparar.hidden = true;
  });
  elModalComparar?.addEventListener('click', (e) => {
    if (e.target === elModalComparar) elModalComparar.hidden = true;
  });

  function baixarRenderAtual() {
    const url = mundo.capturarRenderDataUrl?.();
    if (!url) return;
    const nome = (comodoAtual()?.id || 'casa').replace(/[^a-z0-9_-]/gi, '_');
    fetch(url)
      .then((r) => r.blob())
      .then((blob) => {
        baixarArquivo(`maracaju-88-render-${nome}.png`, blob);
        toast('Imagem PNG do render baixada!');
      });
  }

  elBtnBaixarPng?.addEventListener('click', baixarRenderAtual);
  elBtnBaixarDepois?.addEventListener('click', baixarRenderAtual);

  /** Chamado quando o usuário clica diretamente num móvel no 3D dentro da aba Render. */
  function selecionarMovelDo3D(movelId) {
    const mov = (casa.moveis || []).find((m) => m.id === movelId);
    if (!mov) return;
    estado.comodoSelecionado = mov.comodoId;
    estado.movelSelecionado = mov.id;
    camadaAtiva = 'movel';
    renderTudo();
    toast(`Selecionado para texturizar: ${mov.nome}`);
  }

  renderTudo();

  return {
    renderTudo,
    sincronizarHud,
    selecionarMovelDo3D,
  };
}
