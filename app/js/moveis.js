/**
 * moveis.js — Aba Móveis: catálogo pesquisável de móveis e eletrodomésticos,
 * criador/editor de itens do catálogo e editor completo dos móveis na casa 3D.
 *
 * Totalmente vinculado a `casa.moveis`, `estado.comodoSelecionado` e `mundo` —
 * tudo que for inserido, movido ou editado aparece em Interiores (3D + Planta 2D)
 * e na aba Casa 3D quando o telhado é removido (Ver por dentro / Raio-X).
 */

import {
  buscarCatalogo,
  CATEGORIAS_MOVEIS,
  criarMovelNoComodo,
  FORMAS_MOVEL,
  montarCatalogo,
  normalizarItemCatalogo,
  normalizarMovel,
} from './moveis-catalogo.js';
import { escaparHtml, metros } from './utils.js';

export function iniciarMoveis(ctx) {
  const { estado, casa, mundo, salvar, atualizarTudo, toast, sincronizarInteriores } = ctx;

  const elSelectComodo = document.getElementById('moveisComodoSelect');
  const elBusca = document.getElementById('buscaMoveis');
  const elCats = document.getElementById('catsMoveis');
  const elCatalogo = document.getElementById('listaCatalogoMoveis');
  const elContadorCat = document.getElementById('contadorCatalogoMoveis');
  const elBtnNovoItem = document.getElementById('btnNovoMovelCatalogo');
  const elFormCat = document.getElementById('formCatalogoMovel');
  const elFormCatTitulo = document.getElementById('formCatTitulo');

  const elListaInseridos = document.getElementById('listaMoveisInseridos');
  const elContadorInseridos = document.getElementById('contadorMoveisInseridos');
  const elFiltroInseridos = document.getElementById('filtroMoveisInseridos');
  const elEditor = document.getElementById('editorMovel');
  const elEditorTitulo = document.getElementById('editorMovelTitulo');

  const elBtnIsolar = document.getElementById('btnMoveisIsolar');
  const elBtnParedes = document.getElementById('btnMoveisParedes');
  const elBtnCasaToda = document.getElementById('btnMoveisCasaToda');
  const elBtnFocarComodo = document.getElementById('btnMoveisFocarComodo');

  if (!estado.catalogoEdicoes || typeof estado.catalogoEdicoes !== 'object') estado.catalogoEdicoes = {};
  if (!Array.isArray(estado.catalogoPersonalizado)) estado.catalogoPersonalizado = [];
  if (!Array.isArray(casa.moveis)) casa.moveis = [];

  let categoriaAtiva = 'todos';
  let termoBusca = '';
  let filtroInseridos = 'comodo'; // 'comodo' | 'todos'
  let editandoCatalogoId = null; // null = criando novo; string = editando item existente

  const comodoAtual = () => casa.rooms.find((r) => r.id === estado.comodoSelecionado) || casa.rooms[0] || null;
  const movelAtual = () => casa.moveis.find((m) => m.id === estado.movelSelecionado) || null;
  const catalogoCompleto = () => montarCatalogo(estado.catalogoEdicoes, estado.catalogoPersonalizado);

  function aplicouMoveis({ reconstruir = true, listas = true, editor = true } = {}) {
    if (reconstruir) mundo.atualizarMoveis(casa);
    atualizarTudo();
    sincronizarInteriores?.();
    salvar();
    if (listas) renderInseridos();
    if (editor) renderEditor();
  }

  // ============================ SELETOR DE CÔMODO & HUD ============================
  function renderComodosSelect() {
    if (!elSelectComodo) return;
    elSelectComodo.innerHTML = casa.rooms
      .map(
        (r) =>
          `<option value="${escaparHtml(r.id)}" ${r.id === estado.comodoSelecionado ? 'selected' : ''}>${escaparHtml(r.nome)} (${metros(r.w)} × ${metros(r.d)})</option>`
      )
      .join('');
  }

  function sincronizarHud() {
    const isolando = Boolean(estado.isolarComodo);
    if (elBtnIsolar) {
      elBtnIsolar.classList.toggle('ativo', isolando);
      elBtnIsolar.textContent = isolando ? '✓ Só este cômodo' : '🔍 Só este cômodo';
    }
    const mp = estado.modoParedes || 'inteiras';
    if (elBtnParedes) {
      elBtnParedes.classList.toggle('ativo', mp !== 'inteiras');
      elBtnParedes.textContent = mp === 'ocultas' ? '🧱 Sem paredes' : mp === 'baixas' ? '🧱 Paredes baixas' : '🧱 Paredes';
    }
  }

  elSelectComodo?.addEventListener('change', () => {
    estado.comodoSelecionado = elSelectComodo.value;
    const primeiro = casa.moveis.find((m) => m.comodoId === estado.comodoSelecionado);
    estado.movelSelecionado = primeiro?.id || null;
    salvar();
    sincronizarInteriores?.();
    atualizarTudo();
    renderInseridos();
    renderEditor();
    mundo.focarComodo(estado.comodoSelecionado);
  });

  elBtnIsolar?.addEventListener('click', () => {
    estado.isolarComodo = !estado.isolarComodo;
    sincronizarHud();
    sincronizarInteriores?.();
    salvar();
    atualizarTudo();
    if (estado.isolarComodo && estado.comodoSelecionado) mundo.focarComodo(estado.comodoSelecionado);
  });

  elBtnParedes?.addEventListener('click', () => {
    const ordem = ['inteiras', 'baixas', 'ocultas'];
    const i = ordem.indexOf(estado.modoParedes || 'inteiras');
    estado.modoParedes = ordem[(i + 1) % ordem.length];
    sincronizarHud();
    sincronizarInteriores?.();
    salvar();
    atualizarTudo();
  });

  elBtnCasaToda?.addEventListener('click', () => {
    if (estado.isolarComodo) {
      estado.isolarComodo = false;
      sincronizarHud();
      sincronizarInteriores?.();
      salvar();
      atualizarTudo();
    }
    mundo.aplicarPreset('casa');
  });

  elBtnFocarComodo?.addEventListener('click', () => {
    if (estado.comodoSelecionado) mundo.focarComodo(estado.comodoSelecionado);
  });

  // ============================ CATÁLOGO & PESQUISA ============================
  function renderCategorias() {
    if (!elCats) return;
    elCats.innerHTML = Object.entries(CATEGORIAS_MOVEIS)
      .map(
        ([id, c]) =>
          `<button class="chip ${id === categoriaAtiva ? 'ativo' : ''}" data-cat="${id}">${c.icone} ${c.nome}</button>`
      )
      .join('');
  }

  elCats?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cat]');
    if (!btn) return;
    categoriaAtiva = btn.dataset.cat;
    renderCategorias();
    renderCatalogo();
  });

  elBusca?.addEventListener('input', () => {
    termoBusca = elBusca.value;
    renderCatalogo();
  });

  function renderCatalogo() {
    if (!elCatalogo) return;
    const todos = catalogoCompleto();
    const filtrados = buscarCatalogo(todos, termoBusca, categoriaAtiva);
    if (elContadorCat) elContadorCat.textContent = `${filtrados.length}/${todos.length}`;

    if (!filtrados.length) {
      elCatalogo.innerHTML = '<p class="ajuda">Nenhum móvel encontrado. Clique em <b>＋ Criar novo</b> para cadastrar.</p>';
      return;
    }

    elCatalogo.innerHTML = filtrados
      .map(
        (it) => `
      <div class="movel-cat-item" data-cat-id="${escaparHtml(it.id)}">
        <span class="ponto" style="background:${it.cor}"></span>
        <div class="texto">
          <div class="nome">${escaparHtml(it.nome)} ${!it.padrao ? '<span class="selo medido">meu</span>' : ''}</div>
          <div class="sub">${metros(it.w)} × ${metros(it.d)} × ${metros(it.h)}${it.y > 0 ? ` · h+${metros(it.y)}` : ''}</div>
        </div>
        <div class="acoes-cat">
          <button class="btn sm" data-editar-cat="${escaparHtml(it.id)}" title="Editar modelo do catálogo">✏️</button>
          <button class="btn sm primario" data-inserir-cat="${escaparHtml(it.id)}" title="Inserir no cômodo selecionado">＋</button>
        </div>
      </div>`
      )
      .join('');
  }

  elCatalogo?.addEventListener('click', (e) => {
    const btnInserir = e.target.closest('[data-inserir-cat]');
    if (btnInserir) {
      const item = catalogoCompleto().find((x) => x.id === btnInserir.dataset.inserirCat);
      const room = comodoAtual();
      if (!item || !room) return;
      const novo = criarMovelNoComodo(item, room, casa.moveis);
      casa.moveis.push(novo);
      estado.movelSelecionado = novo.id;
      aplicouMoveis();
      mundo.focarComodo(room.id);
      toast(`"${novo.nome}" inserido em ${room.nome}. Ajuste posição e rotação à direita.`);
      return;
    }
    const btnEditar = e.target.closest('[data-editar-cat]');
    if (btnEditar) {
      const item = catalogoCompleto().find((x) => x.id === btnEditar.dataset.editarCat);
      if (item) abrirFormCatalogo(item);
    }
  });

  // ============================ CRIAR / EDITAR ITEM DO CATÁLOGO ============================
  function abrirFormCatalogo(item = null) {
    editandoCatalogoId = item ? item.id : null;
    elFormCat.hidden = false;
    elFormCatTitulo.textContent = item ? `Editar modelo: ${item.nome}` : 'Criar novo móvel / eletrodoméstico';

    const catOpts = Object.entries(CATEGORIAS_MOVEIS)
      .filter(([id]) => id !== 'todos')
      .map(([id, c]) => `<option value="${id}" ${(item?.categoria || 'personalizado') === id ? 'selected' : ''}>${c.icone} ${c.nome}</option>`)
      .join('');
    const formaOpts = Object.entries(FORMAS_MOVEL)
      .map(([id, nome]) => `<option value="${id}" ${(item?.forma || 'bloco') === id ? 'selected' : ''}>${nome}</option>`)
      .join('');

    const body = document.getElementById('formCatCampos');
    body.innerHTML = `
      <label class="campo"><span>Nome</span><input type="text" id="catNome" maxlength="60" value="${escaparHtml(item?.nome || '')}" placeholder="Ex.: Cristaleira, Airfryer, Piano..." /></label>
      <div class="grade2">
        <label class="campo"><span>Categoria</span><select id="catCategoria">${catOpts}</select></label>
        <label class="campo"><span>Forma 3D</span><select id="catForma">${formaOpts}</select></label>
      </div>
      <div class="grade3">
        <label class="campo"><span>Largura (m)</span><input type="number" id="catW" step="0.05" min="0.15" max="6" value="${(item?.w ?? 1.0).toFixed(2)}" /></label>
        <label class="campo"><span>Prof. (m)</span><input type="number" id="catD" step="0.05" min="0.05" max="6" value="${(item?.d ?? 0.6).toFixed(2)}" /></label>
        <label class="campo"><span>Altura (m)</span><input type="number" id="catH" step="0.05" min="0.02" max="3" value="${(item?.h ?? 0.8).toFixed(2)}" /></label>
      </div>
      <div class="grade2">
        <label class="campo"><span>Altura do chão (m)</span><input type="number" id="catY" step="0.05" min="0" max="2.6" value="${(item?.y ?? 0).toFixed(2)}" /></label>
        <label class="campo"><span>Cor</span><input type="color" id="catCor" value="${item?.cor || '#8a5a3b'}" style="height:32px;padding:2px" /></label>
      </div>
      <div class="grade2" style="margin-top:6px">
        <button class="btn sm primario" id="btnSalvarCat">💾 Salvar no catálogo</button>
        <button class="btn sm azul" id="btnSalvarEInserirCat">＋ Salvar e inserir</button>
      </div>
      <div class="grade2" style="margin-top:6px">
        <button class="btn sm" id="btnCancelarCat">Cancelar</button>
        ${
          item && !item.padrao
            ? '<button class="btn sm perigo" id="btnExcluirCat">🗑️ Excluir modelo</button>'
            : item && estado.catalogoEdicoes[item.id]
              ? '<button class="btn sm" id="btnRestaurarCat">↺ Padrão</button>'
              : '<span></span>'
        }
      </div>
    `;

    const lerFormulario = () =>
      normalizarItemCatalogo({
        id: editandoCatalogoId || `custom-${Date.now().toString(36)}`,
        nome: document.getElementById('catNome').value,
        categoria: document.getElementById('catCategoria').value,
        forma: document.getElementById('catForma').value,
        w: document.getElementById('catW').value,
        d: document.getElementById('catD').value,
        h: document.getElementById('catH').value,
        y: document.getElementById('catY').value,
        cor: document.getElementById('catCor').value,
        padrao: Boolean(item?.padrao),
      });

    const salvarModelo = (inserirDepois) => {
      const novoItem = lerFormulario();
      if (item?.padrao) {
        estado.catalogoEdicoes[item.id] = {
          nome: novoItem.nome,
          categoria: novoItem.categoria,
          forma: novoItem.forma,
          w: novoItem.w,
          d: novoItem.d,
          h: novoItem.h,
          y: novoItem.y,
          cor: novoItem.cor,
        };
      } else if (editandoCatalogoId) {
        const idx = estado.catalogoPersonalizado.findIndex((x) => x.id === editandoCatalogoId);
        if (idx >= 0) estado.catalogoPersonalizado[idx] = novoItem;
        else estado.catalogoPersonalizado.unshift(novoItem);
      } else {
        estado.catalogoPersonalizado.unshift(novoItem);
      }
      elFormCat.hidden = true;
      renderCatalogo();
      if (inserirDepois) {
        const room = comodoAtual();
        if (room) {
          const inst = criarMovelNoComodo(novoItem, room, casa.moveis);
          casa.moveis.push(inst);
          estado.movelSelecionado = inst.id;
          aplicouMoveis();
          mundo.focarComodo(room.id);
          toast(`"${novoItem.nome}" salvo no catálogo e inserido em ${room.nome}!`);
          return;
        }
      }
      salvar();
      toast(`Modelo "${novoItem.nome}" salvo no catálogo.`);
    };

    document.getElementById('btnSalvarCat')?.addEventListener('click', () => salvarModelo(false));
    document.getElementById('btnSalvarEInserirCat')?.addEventListener('click', () => salvarModelo(true));
    document.getElementById('btnCancelarCat')?.addEventListener('click', () => (elFormCat.hidden = true));
    document.getElementById('btnExcluirCat')?.addEventListener('click', () => {
      estado.catalogoPersonalizado = estado.catalogoPersonalizado.filter((x) => x.id !== editandoCatalogoId);
      elFormCat.hidden = true;
      salvar();
      renderCatalogo();
      toast('Modelo personalizado removido do catálogo.');
    });
    document.getElementById('btnRestaurarCat')?.addEventListener('click', () => {
      delete estado.catalogoEdicoes[item.id];
      elFormCat.hidden = true;
      salvar();
      renderCatalogo();
      toast('Modelo restaurado para as medidas padrão.');
    });
  }

  elBtnNovoItem?.addEventListener('click', () => abrirFormCatalogo(null));

  // ============================ LISTA DE MÓVEIS NA CASA ============================
  elFiltroInseridos?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-filtro-mov]');
    if (!btn) return;
    filtroInseridos = btn.dataset.filtroMov;
    elFiltroInseridos.querySelectorAll('[data-filtro-mov]').forEach((b) => b.classList.toggle('ativo', b.dataset.filtroMov === filtroInseridos));
    renderInseridos();
  });

  function renderInseridos() {
    if (!elListaInseridos) return;
    const porId = new Map(casa.rooms.map((r) => [r.id, r]));
    const lista =
      filtroInseridos === 'comodo'
        ? casa.moveis.filter((m) => m.comodoId === estado.comodoSelecionado)
        : casa.moveis;
    if (elContadorInseridos) elContadorInseridos.textContent = `${lista.length} (${casa.moveis.length} na casa)`;

    if (!lista.length) {
      elListaInseridos.innerHTML =
        '<p class="ajuda">Nenhum móvel neste cômodo. Escolha um item no catálogo à esquerda e clique em <b>＋</b>.</p>';
      return;
    }

    elListaInseridos.innerHTML = lista
      .map((m) => {
        const room = porId.get(m.comodoId);
        return `
        <div class="comodo-item ${m.id === estado.movelSelecionado ? 'ativo' : ''}" data-mov-id="${escaparHtml(m.id)}" role="button" tabindex="0">
          <span class="ponto" style="background:${m.cor}"></span>
          <div class="coluna">
            <div class="nome">${escaparHtml(m.nome)}</div>
            <div class="sub">${escaparHtml(room?.nome || m.comodoId)} · ${metros(m.w)} × ${metros(m.d)} × ${metros(m.h)}</div>
          </div>
          <span class="area">${m.rot}°</span>
        </div>`;
      })
      .join('');
  }

  elListaInseridos?.addEventListener('click', (e) => {
    const item = e.target.closest('[data-mov-id]');
    if (!item) return;
    selecionarMovel(item.dataset.movId, true);
  });

  // ============================ EDITOR DO MÓVEL SELECIONADO ============================
  function renderEditor() {
    if (!elEditor) return;
    const m = movelAtual();
    if (!m) {
      if (elEditorTitulo) elEditorTitulo.textContent = 'Nenhum móvel selecionado';
      elEditor.innerHTML = '<p class="ajuda">Clique num móvel na lista acima ou diretamente no 3D para mover, girar ou redimensionar.</p>';
      return;
    }
    const room = casa.rooms.find((r) => r.id === m.comodoId) || comodoAtual();
    if (elEditorTitulo) elEditorTitulo.textContent = m.nome;

    const comodoOpts = casa.rooms
      .map((r) => `<option value="${escaparHtml(r.id)}" ${r.id === m.comodoId ? 'selected' : ''}>${escaparHtml(r.nome)}</option>`)
      .join('');
    const formaOpts = Object.entries(FORMAS_MOVEL)
      .map(([id, nome]) => `<option value="${id}" ${m.forma === id ? 'selected' : ''}>${nome}</option>`)
      .join('');

    const maxX = room ? room.w : 6;
    const maxZ = room ? room.d : 6;

    elEditor.innerHTML = `
      <label class="campo"><span>Nome</span><input type="text" data-mcampo="nome" maxlength="60" value="${escaparHtml(m.nome)}" /></label>
      <div class="grade2">
        <label class="campo"><span>Cômodo</span><select data-mcampo="comodoId">${comodoOpts}</select></label>
        <label class="campo"><span>Forma 3D</span><select data-mcampo="forma">${formaOpts}</select></label>
      </div>

      <div class="mov-dpad">
        <span class="ajuda" style="margin:0">Mover no cômodo (10 cm):</span>
        <div class="mov-setas">
          <button class="btn sm" data-mover="x:-0.1" title="Esquerda">◀</button>
          <button class="btn sm" data-mover="z:-0.1" title="Fundo">▲</button>
          <button class="btn sm" data-mover="z:0.1" title="Frente">▼</button>
          <button class="btn sm" data-mover="x:0.1" title="Direita">▶</button>
          <button class="btn sm azul" data-girar="90" title="Girar 90°">↻ 90°</button>
        </div>
      </div>

      <label class="campo">
        <span>Posição X (esq ↔ dir) <b id="lblMovX">${metros(m.x)}</b></span>
        <input type="range" data-mslider="x" min="0" max="${maxX.toFixed(2)}" step="0.05" value="${m.x}" />
      </label>
      <label class="campo">
        <span>Posição Z (fundo ↔ frente) <b id="lblMovZ">${metros(m.z)}</b></span>
        <input type="range" data-mslider="z" min="0" max="${maxZ.toFixed(2)}" step="0.05" value="${m.z}" />
      </label>
      <div class="grade2">
        <label class="campo">
          <span>Altura do chão <b id="lblMovY">${metros(m.y)}</b></span>
          <input type="range" data-mslider="y" min="0" max="2.5" step="0.05" value="${m.y}" />
        </label>
        <label class="campo">
          <span>Rotação <b id="lblMovRot">${m.rot}°</b></span>
          <input type="range" data-mslider="rot" min="0" max="355" step="5" value="${m.rot}" />
        </label>
      </div>

      <div class="grade3">
        <label class="campo"><span>Larg. (m)</span><input type="number" step="0.05" min="0.12" max="6" data-mcampo="w" value="${m.w.toFixed(2)}" /></label>
        <label class="campo"><span>Prof. (m)</span><input type="number" step="0.05" min="0.04" max="6" data-mcampo="d" value="${m.d.toFixed(2)}" /></label>
        <label class="campo"><span>Alt. (m)</span><input type="number" step="0.05" min="0.02" max="3" data-mcampo="h" value="${m.h.toFixed(2)}" /></label>
      </div>
      <label class="campo"><span>Cor</span><input type="color" data-mcampo="cor" value="${m.cor}" style="height:32px;padding:2px" /></label>

      <div class="grade3" style="margin-top:6px">
        <button class="btn sm" data-acao-mov="centralizar">🎯 Centro</button>
        <button class="btn sm azul" data-acao-mov="duplicar">📋 Duplicar</button>
        <button class="btn sm perigo" data-acao-mov="excluir">🗑️ Remover</button>
      </div>
    `;
  }

  elEditor?.addEventListener('input', (e) => {
    const m = movelAtual();
    if (!m) return;
    const slider = e.target.dataset.mslider;
    if (slider) {
      m[slider] = slider === 'rot' ? Number(e.target.value) : +Number(e.target.value).toFixed(2);
      const lbl = document.getElementById({ x: 'lblMovX', z: 'lblMovZ', y: 'lblMovY', rot: 'lblMovRot' }[slider]);
      if (lbl) lbl.textContent = slider === 'rot' ? `${m.rot}°` : metros(m[slider]);
      aplicouMoveis({ listas: slider === 'rot', editor: false });
      return;
    }
    const campo = e.target.dataset.mcampo;
    if (campo === 'cor' || campo === 'nome') {
      m[campo] = campo === 'nome' ? e.target.value.slice(0, 60) : e.target.value;
      if (campo === 'nome' && elEditorTitulo) elEditorTitulo.textContent = m.nome;
      aplicouMoveis({ listas: true, editor: false });
    }
  });

  elEditor?.addEventListener('change', (e) => {
    const m = movelAtual();
    if (!m) return;
    const campo = e.target.dataset.mcampo;
    if (!campo || campo === 'cor' || campo === 'nome') return;
    if (campo === 'comodoId') {
      const destino = casa.rooms.find((r) => r.id === e.target.value);
      if (destino) {
        m.comodoId = destino.id;
        m.x = +(destino.w / 2).toFixed(2);
        m.z = +(destino.d / 2).toFixed(2);
        estado.comodoSelecionado = destino.id;
        renderComodosSelect();
        aplicouMoveis();
        mundo.focarComodo(destino.id);
        toast(`"${m.nome}" movido para ${destino.nome}.`);
      }
      return;
    }
    if (campo === 'forma') {
      m.forma = FORMAS_MOVEL[e.target.value] ? e.target.value : 'bloco';
      aplicouMoveis();
      return;
    }
    if (['w', 'd', 'h'].includes(campo)) {
      const norm = normalizarMovel({ ...m, [campo]: Number(e.target.value) }, casa.rooms);
      m[campo] = norm[campo];
      aplicouMoveis();
    }
  });

  elEditor?.addEventListener('click', (e) => {
    const m = movelAtual();
    if (!m) return;
    const mover = e.target.dataset.mover;
    if (mover) {
      const [eixo, delta] = mover.split(':');
      const room = casa.rooms.find((r) => r.id === m.comodoId);
      const max = eixo === 'x' ? room?.w || 6 : room?.d || 6;
      m[eixo] = +Math.min(max, Math.max(0, m[eixo] + Number(delta))).toFixed(2);
      aplicouMoveis();
      return;
    }
    const girar = e.target.dataset.girar;
    if (girar) {
      m.rot = (m.rot + Number(girar) + 360) % 360;
      aplicouMoveis();
      return;
    }
    const acao = e.target.dataset.acaoMov;
    if (acao === 'centralizar') {
      const room = casa.rooms.find((r) => r.id === m.comodoId);
      if (room) {
        m.x = +(room.w / 2).toFixed(2);
        m.z = +(room.d / 2).toFixed(2);
        aplicouMoveis();
      }
    } else if (acao === 'duplicar') {
      const room = casa.rooms.find((r) => r.id === m.comodoId);
      const copia = normalizarMovel(
        {
          ...m,
          id: `mov-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          x: Math.min(room ? room.w - 0.15 : m.x + 0.3, m.x + 0.3),
          z: Math.min(room ? room.d - 0.15 : m.z + 0.3, m.z + 0.3),
        },
        casa.rooms
      );
      casa.moveis.push(copia);
      estado.movelSelecionado = copia.id;
      aplicouMoveis();
      toast(`"${m.nome}" duplicado.`);
    } else if (acao === 'excluir') {
      const nome = m.nome;
      casa.moveis = casa.moveis.filter((x) => x.id !== m.id);
      const prox = casa.moveis.find((x) => x.comodoId === estado.comodoSelecionado);
      estado.movelSelecionado = prox?.id || null;
      aplicouMoveis();
      toast(`"${nome}" removido.`);
    }
  });

  function selecionarMovel(id, focar = false) {
    const m = casa.moveis.find((x) => x.id === id);
    if (!m) return;
    estado.movelSelecionado = m.id;
    if (m.comodoId && m.comodoId !== estado.comodoSelecionado) {
      estado.comodoSelecionado = m.comodoId;
      renderComodosSelect();
      sincronizarInteriores?.();
    }
    salvar();
    atualizarTudo();
    renderInseridos();
    renderEditor();
    if (focar) mundo.focarComodo(m.comodoId);
  }

  function renderTudo() {
    renderComodosSelect();
    renderCategorias();
    renderCatalogo();
    renderInseridos();
    renderEditor();
    sincronizarHud();
  }

  renderTudo();

  return {
    renderTudo,
    selecionarMovel,
    sincronizarHud,
  };
}
