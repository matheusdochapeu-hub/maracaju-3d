/**
 * interiores.js — Aba Interiores: lista de cômodos, editor, planta 2D e passeio.
 *
 * O 3D em si é do mundo.js/casa-3d.js. Aqui ficam a interação com o modelo
 * (arrastar na planta, editar medidas, portas e janelas) e o modo passeio.
 */

import { aberturasVisiveis, areaComodo, completudeComodo, limitarAoEnvelope, moverComColisao, PISOS, redeDeParedes, TIPOS_COMODO, diagnosticarPlanta } from './casa-modelo.js';
import { escaparHtml, metros } from './utils.js';
import { ROTEIRO_CAPTURA } from './config.js';

const PAREDES = { frente: 'Frente', fundo: 'Fundo', esquerda: 'Esquerda', direita: 'Direita' };

export function iniciarInteriores(ctx) {
  const { estado, casa, mundo, salvar, atualizarTudo, toast } = ctx;
  const elLista = document.getElementById('listaComodos');
  const elEditor = document.getElementById('editorComodo');
  const elTitulo = document.getElementById('editorTitulo');
  const elSol = document.getElementById('comodoSol');
  const elSolTarde = document.getElementById('comodoSolTarde');
  const elSolNota = document.getElementById('comodoSolNota');
  const elPlanta = document.getElementById('canvasPlanta');
  const elPalco = document.getElementById('palcoInterior');
  const elDica = document.getElementById('dicaPalco');
  const elLegenda = document.getElementById('plantaLegenda');
  const elStatus = document.getElementById('plantaStatus');
  const elDpad = document.getElementById('dpad');
  const elPasseio = document.getElementById('passeioAjuda');
  const elBtnEditar = document.getElementById('btnPlantaEditar');
  const canvas3d = document.getElementById('canvas3d');

  let transform = { esc: 40, ox: 0, oy: 0, w: 0, h: 0 };
  let arrasto = null;
  let emPasseio = false;
  let olhando = false;
  let ultimoPonteiro = { x: 0, y: 0 };
  const teclas = new Set();
  const passeio = { x: 0, z: 0, yaw: 0, pitch: -0.06 };

  const comodo = () => casa.rooms.find((r) => r.id === estado.comodoSelecionado) || casa.rooms[0] || null;
  const fotosDe = (id) => ctx.contarFotos()[id] || 0;

  /** Avisa todo mundo que o modelo mudou e salva (uma vez só). */
  function aplicouMudanca({ reconstruir = true, editor = true } = {}) {
    if (reconstruir) mundo.definirCasa(casa);
    ctx.atualizarTudo();
    salvar();
    renderLista();
    if (editor) renderEditor();
    desenharPlanta();
    atualizarSol();
  }

  // ============================ LISTA ============================
  function renderLista() {
    const fotos = ctx.contarFotos();
    elLista.innerHTML = casa.rooms
      .map((r) => {
        const c = completudeComodo(r, fotos[r.id] || 0);
        return `
        <div class="comodo-item ${r.id === estado.comodoSelecionado ? 'ativo' : ''}" data-comodo="${escaparHtml(r.id)}" role="button" tabindex="0">
          <span class="ponto" style="background:${r.cor}"></span>
          <div class="coluna">
            <div class="nome">${escaparHtml(r.nome)}
              <span class="selo ${r.status === 'medido' ? 'medido' : ''}">${r.status === 'medido' ? 'medido' : 'estimado'}</span>
            </div>
            <div class="sub">${areaComodo(r).toFixed(1).replace('.', ',')} m² · ${metros(r.w)} × ${metros(r.d)}</div>
            <div class="barra-mini"><i style="width:${c.score}%"></i></div>
          </div>
          <span class="area">${c.score}%</span>
        </div>`;
      })
      .join('');
  }

  elLista.addEventListener('click', (e) => {
    const item = e.target.closest('[data-comodo]');
    if (!item) return;
    selecionar(item.dataset.comodo, true);
  });

  elLista.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const item = e.target.closest('[data-comodo]');
    if (!item) return;
    e.preventDefault();
    selecionar(item.dataset.comodo, true);
  });

  // ============================ EDITOR ============================
  function renderEditor() {
    const r = comodo();
    if (!r) {
      elTitulo.textContent = 'Cômodo';
      elEditor.innerHTML = '<p class="ajuda">Nenhum cômodo na planta. Adicione um para começar.</p>';
      return;
    }
    elTitulo.textContent = r.nome;
    const fotos = fotosDe(r.id);
    const alvo = ROTEIRO_CAPTURA[r.id]?.alvo || 6;
    const c = completudeComodo(r, fotos);
    const pisoOpts = Object.entries(PISOS)
      .map(([id, p]) => `<option value="${id}" ${r.piso === id ? 'selected' : ''}>${p.nome}</option>`)
      .join('');
    const tipoOpts = Object.entries(TIPOS_COMODO)
      .map(([id, nome]) => `<option value="${id}" ${r.tipo === id ? 'selected' : ''}>${nome}</option>`)
      .join('');

    const linhasAbertura = (lista, tipo) =>
      lista
        .map(
          (a, i) => `
        <div class="abertura">
          <div class="abertura-topo">
            <b>${tipo === 'porta' ? '🚪 Porta' : '🪟 Janela'} ${i + 1}</b>
            <button class="btn sm perigo" data-remover="${tipo}:${i}" aria-label="Remover ${tipo}">✕</button>
          </div>
          <div class="grade2">
            <label class="campo"><span>Parede</span>
              <select data-ab="${tipo}:${i}:parede">
                ${Object.entries(PAREDES).map(([id, nome]) => `<option value="${id}" ${a.parede === id ? 'selected' : ''}>${nome}</option>`).join('')}
              </select>
            </label>
            <label class="campo"><span>Início (m)</span>
              <input type="number" step="0.05" min="0" data-ab="${tipo}:${i}:inicio" value="${a.inicio}" />
            </label>
          </div>
          <div class="grade2">
            <label class="campo"><span>Largura (m)</span>
              <input type="number" step="0.05" min="0.3" data-ab="${tipo}:${i}:largura" value="${a.largura}" />
            </label>
            ${
              tipo === 'porta'
                ? `<label class="campo"><span>Altura (m)</span><input type="number" step="0.05" min="1.6" data-ab="${tipo}:${i}:altura" value="${a.altura}" /></label>`
                : `<label class="campo"><span>Peitoril (m)</span><input type="number" step="0.05" min="0" data-ab="${tipo}:${i}:peitoril" value="${a.peitoril}" /></label>`
            }
          </div>
        </div>`
        )
        .join('') || '<p class="ajuda">Nenhuma registrada ainda.</p>';

    elEditor.innerHTML = `
      <label class="campo"><span>Nome</span><input type="text" data-campo="nome" value="${escaparHtml(r.nome)}" maxlength="60" /></label>
      <div class="grade2">
        <label class="campo"><span>Largura (m)</span><input type="number" step="0.05" min="0.6" data-campo="w" value="${r.w.toFixed(2)}" /></label>
        <label class="campo"><span>Profundidade (m)</span><input type="number" step="0.05" min="0.6" data-campo="d" value="${r.d.toFixed(2)}" /></label>
      </div>
      <div class="grade2">
        <label class="campo"><span>Tipo</span><select data-campo="tipo">${tipoOpts}</select></label>
        <label class="campo"><span>Piso</span><select data-campo="piso">${pisoOpts}</select></label>
      </div>
      <label class="campo" style="flex-direction:row;align-items:center;gap:8px;margin:10px 0">
        <input type="checkbox" data-campo="medido" ${r.status === 'medido' ? 'checked' : ''} />
        <span>Medidas conferidas com trena</span>
      </label>
      <label class="campo"><span>Anotações de reforma</span>
        <textarea data-campo="notas" maxlength="500" placeholder="Ex.: trocar a janela, tirar a parede da cozinha, ponto de ar-condicionado...">${escaparHtml(r.notas)}</textarea>
      </label>

      <details class="aberturas">
        <summary>Portas e janelas (${r.portas.length + r.janelas.length})</summary>
        <h3>Portas</h3>
        ${linhasAbertura(r.portas, 'porta')}
        <button class="btn sm full" data-adicionar="porta" style="margin:4px 0 10px">＋ Porta</button>
        <h3>Janelas</h3>
        ${linhasAbertura(r.janelas, 'janela')}
        <button class="btn sm full" data-adicionar="janela" style="margin-top:4px">＋ Janela</button>
        <p class="ajuda" style="margin-top:6px">O início é medido a partir do canto de menor valor da parede (frente/fundo: da esquerda; esquerda/direita: do fundo).</p>
      </details>

      <p class="ajuda" style="margin:10px 0 4px">📷 <b>${fotos}/${alvo}</b> fotos · ${c.score}% levantado</p>
      <button class="btn sm full" data-acao="fotografar">📸 Fotografar este cômodo</button>

      <div class="editor-acoes">
        <button class="btn sm" data-acao="focar">Centralizar câmera</button>
        <button class="btn sm" data-acao="medido">${r.status === 'medido' ? 'Marcar como estimado' : 'Marcar como medido'}</button>
        <button class="btn sm perigo" data-acao="remover">Remover</button>
      </div>
      <p class="ajuda" style="margin-top:8px">Dica: arraste o cômodo na <b>Planta</b> para reposicionar. O canto inferior direito redimensiona.</p>
    `;
  }

  // Delegação dos campos do editor
  elEditor.addEventListener('change', (e) => {
    const alvo = e.target;
    const r = comodo();
    if (!r) return;
    const campo = alvo.dataset.campo;
    if (campo) {
      if (campo === 'nome') r.nome = alvo.value.trim() || r.nome;
      else if (campo === 'w' || campo === 'd') {
        r[campo] = Math.max(0.6, Number(alvo.value) || r[campo]);
        limitarAoEnvelope(r, casa.envelope);
      } else if (campo === 'tipo') r.tipo = alvo.value;
      else if (campo === 'piso') r.piso = alvo.value;
      else if (campo === 'medido') r.status = alvo.checked ? 'medido' : 'estimado';
      else if (campo === 'notas') r.notas = alvo.value.slice(0, 500);
      aplicouMudanca({ editor: false });
      return;
    }

    const ab = alvo.dataset.ab;
    if (ab) {
      const [tipo, indice, chave] = ab.split(':');
      const lista = tipo === 'porta' ? r.portas : r.janelas;
      const item = lista[Number(indice)];
      if (!item) return;
      if (chave === 'parede') item.parede = alvo.value;
      else item[chave] = Math.max(0, Number(alvo.value) || 0);
      aplicouMudanca({ editor: false });
      return;
    }
  });

  elEditor.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const r = comodo();
    if (!r) return;
    if (btn.dataset.adicionar) {
      if (btn.dataset.adicionar === 'porta') r.portas.push({ parede: 'direita', inicio: 0.6, largura: 0.8, altura: 2.1 });
      else r.janelas.push({ parede: 'esquerda', inicio: 0.6, largura: 1.2, altura: 1.1, peitoril: 1.0 });
      aplicouMudanca();
      renderEditor();
      elEditor.querySelector('details')?.setAttribute('open', '');
      return;
    }
    if (btn.dataset.remover) {
      const [tipo, indice] = btn.dataset.remover.split(':');
      const lista = tipo === 'porta' ? r.portas : r.janelas;
      lista.splice(Number(indice), 1);
      aplicouMudanca();
      renderEditor();
      return;
    }
    if (btn.dataset.acao === 'focar') {
      mundo.focarComodo(r.id);
      return;
    }
    if (btn.dataset.acao === 'fotografar') {
      ctx.abrirCamera(r.id);
      return;
    }
    if (btn.dataset.acao === 'medido') {
      r.status = r.status === 'medido' ? 'estimado' : 'medido';
      aplicouMudanca();
      return;
    }
    if (btn.dataset.acao === 'remover') {
      if (casa.rooms.length <= 1) {
        toast('A casa precisa de pelo menos um cômodo.');
        return;
      }
      if (!confirm(`Remover "${r.nome}" da planta?`)) return;
      casa.rooms = casa.rooms.filter((x) => x.id !== r.id);
      estado.comodoSelecionado = casa.rooms[0].id;
      aplicouMudanca();
    }
  });

  // Nome e notas: atualizam sem esperar o blur (mas com um respiro)
  let timerTexto = null;
  elEditor.addEventListener('input', (e) => {
    const campo = e.target.dataset.campo;
    if (campo !== 'nome' && campo !== 'notas') return;
    const r = comodo();
    if (!r) return;
    const valor = e.target.value;
    clearTimeout(timerTexto);
    timerTexto = setTimeout(() => {
      if (campo === 'nome') r.nome = valor.trim() || r.nome;
      else r.notas = valor.slice(0, 500);
      salvar();
      renderLista();
      elTitulo.textContent = r.nome;
    }, 320);
  });

  // ============================ SELEÇÃO ============================
  function selecionar(id, focar = false) {
    if (!casa.rooms.some((r) => r.id === id)) return;
    estado.comodoSelecionado = id;
    if (emPasseio) {
      const r = comodo();
      if (r) {
        passeio.x = r.x + r.w / 2;
        passeio.z = r.z + r.d / 2;
      }
    }
    salvar();
    renderLista();
    renderEditor();
    atualizarSol();
    desenharPlanta();
    if (focar && estado.modo === '3d') mundo.focarComodo(id);
    if (focar && estado.modo === 'planta') {
      ajustarCanvasPlanta();
      desenharPlanta();
    }
  }

  // ============================ SOL DO CÔMODO ============================
  function atualizarSol() {
    const r = comodo();
    if (!r) {
      elSol.textContent = '—';
      elSolTarde.textContent = '—';
      elSolNota.textContent = 'Selecione um cômodo para calcular.';
      return;
    }
    try {
      const dados = mundo.diagnosticarComodo(r);
      elSol.textContent = `${dados.horas} h/dia`;
      elSolTarde.textContent = `${dados.horasTarde} h`;
      if (dados.horas < 0.6) {
        elSolNota.textContent = 'Quase sem sol direto: bom para dormir, ruim para secar roupa. Considere clarabóia ou telha translúcida.';
      } else if (dados.horasTarde >= 2.5) {
        elSolNota.textContent = 'Sol forte da tarde: é o cômodo que mais esquenta. Cortina térmica ou brise resolve.';
      } else {
        elSolNota.textContent = 'Sol equilibrado para o clima de Ribeirão Preto.';
      }
    } catch {
      elSol.textContent = '—';
      elSolNota.textContent = 'Não foi possível calcular agora.';
    }
  }

  // ============================ PLANTA 2D ============================
  function ajustarCanvasPlanta() {
    const w = elPalco.clientWidth;
    const h = elPalco.clientHeight;
    if (!w || !h) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    elPlanta.width = Math.round(w * dpr);
    elPlanta.height = Math.round(h * dpr);
    elPlanta.style.width = `${w}px`;
    elPlanta.style.height = `${h}px`;
    const g = elPlanta.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    transform.w = w;
    transform.h = h;
    return true;
  }

  const paraTelaX = (x) => transform.ox + (x - casa.envelope.x0) * transform.esc;
  const paraTelaY = (z) => transform.oy + (z - casa.envelope.z0) * transform.esc;
  const paraLocalX = (px) => casa.envelope.x0 + (px - transform.ox) / transform.esc;
  const paraLocalZ = (py) => casa.envelope.z0 + (py - transform.oy) / transform.esc;

  function desenharPlanta() {
    if (estado.modo !== 'planta' || !transform.w) return;
    const g = elPlanta.getContext('2d');
    const w = transform.w;
    const h = transform.h;
    const env = casa.envelope;
    const margemX = 46;
    const margemY = 42;
    const largura = env.x1 - env.x0;
    const profundidade = env.z1 - env.z0;
    const esc = Math.max(4, Math.min((w - margemX * 2) / largura, (h - margemY * 2) / profundidade));
    transform.esc = esc;
    transform.ox = margemX + ((w - margemX * 2) - largura * esc) / 2;
    transform.oy = margemY + ((h - margemY * 2) - profundidade * esc) / 2;

    g.clearRect(0, 0, w, h);
    g.fillStyle = '#08111a';
    g.fillRect(0, 0, w, h);

    // Grade de 1 m
    g.strokeStyle = 'rgba(255,255,255,0.045)';
    g.lineWidth = 1;
    for (let x = Math.ceil(env.x0); x <= env.x1; x++) {
      g.beginPath();
      g.moveTo(paraTelaX(x), paraTelaY(env.z0));
      g.lineTo(paraTelaX(x), paraTelaY(env.z1));
      g.stroke();
    }
    for (let z = Math.ceil(env.z0); z <= env.z1; z++) {
      g.beginPath();
      g.moveTo(paraTelaX(env.x0), paraTelaY(z));
      g.lineTo(paraTelaX(env.x1), paraTelaY(z));
      g.stroke();
    }

    // Envelope
    g.fillStyle = '#0d1823';
    g.fillRect(paraTelaX(env.x0), paraTelaY(env.z0), largura * esc, profundidade * esc);
    g.strokeStyle = '#31465c';
    g.lineWidth = 1;
    g.strokeRect(paraTelaX(env.x0), paraTelaY(env.z0), largura * esc, profundidade * esc);

    // Pisos
    for (const r of casa.rooms) {
      const sel = r.id === estado.comodoSelecionado;
      g.fillStyle = hexComAlfa(r.cor, sel ? 0.34 : 0.15);
      g.fillRect(paraTelaX(r.x), paraTelaY(r.z), r.w * esc, r.d * esc);
      g.strokeStyle = sel ? '#ffffff' : hexComAlfa(r.cor, 0.55);
      g.lineWidth = sel ? 2.4 : 1.2;
      g.strokeRect(paraTelaX(r.x), paraTelaY(r.z), r.w * esc, r.d * esc);
    }

    // Paredes (os vãos de porta e janela aparecem naturalmente)
    for (const b of redeDeParedes(casa)) {
      if (b.tipo !== 'parede') continue;
      g.fillStyle = b.externa ? 'rgba(226,221,213,0.92)' : 'rgba(243,240,234,0.8)';
      if (b.eixo === 'h') {
        g.fillRect(paraTelaX(b.ini), paraTelaY(b.coord) - (b.espessura * esc) / 2, (b.fim - b.ini) * esc, Math.max(2, b.espessura * esc));
      } else {
        g.fillRect(paraTelaX(b.coord) - (b.espessura * esc) / 2, paraTelaY(b.ini), Math.max(2, b.espessura * esc), (b.fim - b.ini) * esc);
      }
    }

    // Portas e janelas
    for (const a of aberturasVisiveis(casa)) {
      if (a.eixo === 'h') {
        const x1 = paraTelaX(a.ini);
        const x2 = paraTelaX(a.fim);
        const y = paraTelaY(a.coord);
        if (a.tipo === 'janela') {
          g.strokeStyle = '#38bdf8';
          g.lineWidth = 3;
          g.beginPath();
          g.moveTo(x1, y);
          g.lineTo(x2, y);
          g.stroke();
        } else {
          g.strokeStyle = '#fbbf24';
          g.lineWidth = 2;
          g.beginPath();
          g.moveTo(x1, y);
          g.arc(x1, y, x2 - x1, 0, -Math.PI / 2, true);
          g.stroke();
        }
      } else {
        const y1 = paraTelaY(a.ini);
        const y2 = paraTelaY(a.fim);
        const x = paraTelaX(a.coord);
        if (a.tipo === 'janela') {
          g.strokeStyle = '#38bdf8';
          g.lineWidth = 3;
          g.beginPath();
          g.moveTo(x, y1);
          g.lineTo(x, y2);
          g.stroke();
        } else {
          g.strokeStyle = '#fbbf24';
          g.lineWidth = 2;
          g.beginPath();
          g.moveTo(x, y1);
          g.arc(x, y1, y2 - y1, 0, Math.PI / 2, false);
          g.stroke();
        }
      }
    }

    // Nomes e medidas
    for (const r of casa.rooms) {
      const cx = paraTelaX(r.x + r.w / 2);
      const cy = paraTelaY(r.z + r.d / 2);
      const larguraPx = r.w * esc;
      const alturaPx = r.d * esc;
      if (larguraPx < 46 || alturaPx < 28) continue;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = '#eef6ff';
      g.font = `700 ${Math.max(10, Math.min(13, larguraPx / 12))}px Segoe UI, system-ui, sans-serif`;
      g.fillText(r.nome, cx, cy - (alturaPx > 54 ? 8 : 0));
      if (alturaPx > 54) {
        g.fillStyle = 'rgba(200,220,240,0.72)';
        g.font = '600 9.5px Segoe UI, system-ui, sans-serif';
        g.fillText(`${r.w.toFixed(2).replace('.', ',')} × ${r.d.toFixed(2).replace('.', ',')} m`, cx, cy + 8);
      }
    }

    // Alça de redimensionamento do cômodo selecionado
    const sel = comodo();
    if (sel && estado.plantaEditar) {
      const hx = paraTelaX(sel.x + sel.w);
      const hy = paraTelaY(sel.z + sel.d);
      g.fillStyle = '#22c55e';
      g.strokeStyle = '#052e16';
      g.lineWidth = 2;
      g.beginPath();
      g.rect(hx - 7, hy - 7, 14, 14);
      g.fill();
      g.stroke();
    }

    // Cotas gerais
    g.strokeStyle = 'rgba(147,168,189,0.6)';
    g.fillStyle = 'rgba(200,220,240,0.85)';
    g.lineWidth = 1;
    g.font = '600 10.5px Segoe UI, system-ui, sans-serif';
    const yCota = paraTelaY(env.z1) + 20;
    g.beginPath();
    g.moveTo(paraTelaX(env.x0), yCota);
    g.lineTo(paraTelaX(env.x1), yCota);
    g.moveTo(paraTelaX(env.x0), yCota - 5);
    g.lineTo(paraTelaX(env.x0), yCota + 5);
    g.moveTo(paraTelaX(env.x1), yCota - 5);
    g.lineTo(paraTelaX(env.x1), yCota + 5);
    g.stroke();
    g.textAlign = 'center';
    g.textBaseline = 'bottom';
    g.fillText(`${largura.toFixed(2).replace('.', ',')} m`, (paraTelaX(env.x0) + paraTelaX(env.x1)) / 2, yCota - 3);

    const xCota = paraTelaX(env.x1) + 24;
    g.beginPath();
    g.moveTo(xCota, paraTelaY(env.z0));
    g.lineTo(xCota, paraTelaY(env.z1));
    g.moveTo(xCota - 5, paraTelaY(env.z0));
    g.lineTo(xCota + 5, paraTelaY(env.z0));
    g.moveTo(xCota - 5, paraTelaY(env.z1));
    g.lineTo(xCota + 5, paraTelaY(env.z1));
    g.stroke();
    g.save();
    g.translate(xCota + 14, (paraTelaY(env.z0) + paraTelaY(env.z1)) / 2);
    g.rotate(-Math.PI / 2);
    g.textAlign = 'center';
    g.textBaseline = 'bottom';
    g.fillText(`${profundidade.toFixed(2).replace('.', ',')} m`, 0, 0);
    g.restore();

    // Norte (roda com o azimute do lote)
    const az = (estado.lotAzimuth ?? 40) * (Math.PI / 180);
    const nx = -Math.sin(az);
    const ny = -Math.cos(az);
    const bx = w - 34;
    const by = 30;
    g.strokeStyle = '#ef4444';
    g.fillStyle = '#ef4444';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(bx - nx * 13, by - ny * 13);
    g.lineTo(bx + nx * 9, by + ny * 9);
    g.stroke();
    g.beginPath();
    g.arc(bx + nx * 10, by + ny * 10, 3, 0, Math.PI * 2);
    g.fill();
    g.font = '700 10px Segoe UI, system-ui, sans-serif';
    g.textAlign = 'center';
    g.fillText('N', bx + nx * 20, by + ny * 20 - 2);

    // Frente e fundo
    g.fillStyle = 'rgba(147,168,189,0.7)';
    g.font = '600 9.5px Segoe UI, system-ui, sans-serif';
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.fillText('↑ fundo', 10, 10);
    g.textAlign = 'left';
    g.textBaseline = 'bottom';
    g.fillText('↓ frente (rua)', 10, h - 10);

    // Escala
    g.strokeStyle = 'rgba(147,168,189,0.7)';
    g.lineWidth = 2;
    const escalaX = w - 70;
    const escalaY = h - 22;
    g.beginPath();
    g.moveTo(escalaX, escalaY);
    g.lineTo(escalaX + esc, escalaY);
    g.stroke();
    g.fillStyle = 'rgba(147,168,189,0.8)';
    g.font = '600 9.5px Segoe UI, system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'bottom';
    g.fillText('1 m', escalaX + esc / 2, escalaY - 2);
  }

  function hexComAlfa(hex, alfa) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alfa})`;
  }

  // Arrastar/redimensionar na planta
  elPlanta.addEventListener('pointerdown', (e) => {
    if (estado.modo !== 'planta') return;
    const rect = elPlanta.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const x = paraLocalX(px);
    const z = paraLocalZ(py);
    const sel = comodo();

    if (estado.plantaEditar && sel) {
      const hx = paraTelaX(sel.x + sel.w);
      const hy = paraTelaY(sel.z + sel.d);
      if (Math.hypot(px - hx, py - hy) < 16) {
        arrasto = { tipo: 'redimensionar', id: sel.id, x, z, base: { w: sel.w, d: sel.d } };
        elPlanta.setPointerCapture(e.pointerId);
        elStatus.textContent = 'Puxe para redimensionar…';
        return;
      }
    }

    const alvo = casa.rooms.find((r) => x >= r.x && x <= r.x + r.w && z >= r.z && z <= r.z + r.d);
    if (!alvo) return;
    if (alvo.id !== estado.comodoSelecionado) selecionar(alvo.id, false);
    if (estado.plantaEditar) {
      arrasto = { tipo: 'mover', id: alvo.id, x, z, base: { x: alvo.x, z: alvo.z } };
      elPlanta.setPointerCapture(e.pointerId);
      elStatus.textContent = 'Arraste para posicionar…';
    }
  });

  elPlanta.addEventListener('pointermove', (e) => {
    if (!arrasto) return;
    const rect = elPlanta.getBoundingClientRect();
    const x = paraLocalX(e.clientX - rect.left);
    const z = paraLocalZ(e.clientY - rect.top);
    const r = casa.rooms.find((q) => q.id === arrasto.id);
    if (!r) return;
    const passo = 0.05;
    if (arrasto.tipo === 'mover') {
      const dx = Math.round((x - arrasto.x) / passo) * passo;
      const dz = Math.round((z - arrasto.z) / passo) * passo;
      r.x = arrasto.base.x + dx;
      r.z = arrasto.base.z + dz;
    } else {
      const dw = Math.round((x - arrasto.x) / passo) * passo;
      const dd = Math.round((z - arrasto.z) / passo) * passo;
      r.w = Math.max(0.6, arrasto.base.w + dw);
      r.d = Math.max(0.6, arrasto.base.d + dd);
    }
    limitarAoEnvelope(r, casa.envelope);
    elStatus.textContent = `${r.nome}: ${r.w.toFixed(2).replace('.', ',')} × ${r.d.toFixed(2).replace('.', ',')} m`;
    desenharPlanta();
  });

  const terminarArrasto = () => {
    if (!arrasto) return;
    arrasto = null;
    const diag = diagnosticarPlanta(casa);
    elStatus.textContent = diag.avisos[0] || 'Arraste para mover · puxe o canto para redimensionar';
    mundo.definirCasa(casa);
    ctx.atualizarTudo();
    salvar();
    renderLista();
    renderEditor();
    atualizarSol();
    desenharPlanta();
  };

  elPlanta.addEventListener('pointerup', terminarArrasto);
  elPlanta.addEventListener('pointercancel', terminarArrasto);

  // ============================ MODOS ============================
  function aplicarModo() {
    const modo = estado.modo || '3d';
    document.querySelectorAll('[data-modo]').forEach((b) => b.classList.toggle('ativo', b.dataset.modo === modo));
    elPlanta.hidden = modo !== 'planta';
    elDpad.hidden = modo !== 'passeio';
    elPasseio.hidden = modo !== 'passeio';
    elLegenda.hidden = modo !== 'planta';
    elBtnEditar.hidden = modo !== 'planta';
    elBtnEditar.classList.toggle('ativo', Boolean(estado.plantaEditar));
    elBtnEditar.textContent = estado.plantaEditar ? '✓ Editando planta' : '✏️ Editar planta';

    if (modo === 'planta') {
      elDica.textContent = 'Arraste os cômodos e puxe o canto verde para redimensionar. As medidas aparecem na planta.';
      ajustarCanvasPlanta();
      desenharPlanta();
    } else if (modo === 'passeio') {
      elDica.textContent = 'Ande com o direcional ou WASD. Arraste na tela para olhar.';
      entrarPasseio();
    } else {
      elDica.textContent = 'Clique num cômodo para ver de perto. Use "Passeio" para andar por dentro.';
      sairPasseio();
      if (estado.comodoSelecionado) mundo.focarComodo(estado.comodoSelecionado);
    }
    if (modo !== 'passeio') sairPasseio();
  }

  document.querySelectorAll('[data-modo]').forEach((btn) => {
    btn.addEventListener('click', () => {
      estado.modo = btn.dataset.modo;
      salvar();
      aplicarModo();
      ctx.atualizarTudo();
    });
  });

  document.getElementById('btnPlantaEditar').addEventListener('click', () => {
    estado.plantaEditar = !estado.plantaEditar;
    salvar();
    aplicarModo();
    desenharPlanta();
  });

  document.getElementById('btnFocarCasa').addEventListener('click', () => {
    if (estado.modo === 'passeio') {
      estado.modo = '3d';
      salvar();
      aplicarModo();
      ctx.atualizarTudo();
    }
    mundo.aplicarPreset('casa');
  });

  document.getElementById('btnFocarComodo').addEventListener('click', () => {
    if (estado.comodoSelecionado) mundo.focarComodo(estado.comodoSelecionado);
  });

  document.getElementById('btnAddComodo').addEventListener('click', () => {
    const env = casa.envelope;
    const id = `comodo-${Date.now().toString(36)}`;
    const novo = {
      id,
      nome: `Novo cômodo ${casa.rooms.length + 1}`,
      tipo: 'outro',
      x: Math.round((env.x0 + 0.4) * 20) / 20,
      z: Math.round((env.z0 + 0.4) * 20) / 20,
      w: 2,
      d: 2,
      cor: '#34d399',
      piso: 'nao_definido',
      status: 'estimado',
      notas: '',
      portas: [{ parede: 'direita', inicio: 0.5, largura: 0.8, altura: 2.1 }],
      janelas: [],
    };
    casa.rooms.push(novo);
    estado.comodoSelecionado = id;
    aplicouMudanca();
    estado.modo = 'planta';
    aplicarModo();
    desenharPlanta();
    toast('Cômodo criado. Arraste na planta para encaixar no lugar.');
  });

  // ============================ PASSEIO ============================
  function entrarPasseio() {
    if (emPasseio) return;
    const r = comodo();
    if (!r) return;
    emPasseio = true;
    passeio.x = r.x + r.w / 2;
    passeio.z = r.z + r.d / 2;
    passeio.yaw = r.w > r.d ? Math.PI / 2 : 0;
    passeio.pitch = -0.05;
    mundo.controls.enabled = false;
    mundo.controls.enableDamping = false;
    mundo.camera.fov = 66;
    mundo.camera.updateProjectionMatrix();
    aplicarCameraPasseio();
    passarCanvasParaInterior();
  }

  function sairPasseio() {
    if (!emPasseio) return;
    emPasseio = false;
    mundo.camera.fov = 46;
    mundo.camera.updateProjectionMatrix();
    mundo.controls.enabled = true;
    mundo.controls.enableDamping = true;
    if (estado.comodoSelecionado) mundo.focarComodo(estado.comodoSelecionado);
  }

  function aplicarCameraPasseio() {
    const cos = Math.cos(passeio.pitch);
    const olho = mundo.localParaMundo(passeio.x, 1.62, passeio.z);
    const alvo = mundo.localParaMundo(
      passeio.x + Math.sin(passeio.yaw) * cos,
      1.62 + Math.sin(passeio.pitch),
      passeio.z + Math.cos(passeio.yaw) * cos
    );
    mundo.camera.position.copy(olho);
    mundo.camera.up.set(0, 1, 0);
    mundo.camera.lookAt(alvo);
  }

  function passarCanvasParaInterior() {
    const palco = document.getElementById('palcoInterior');
    if (canvas3d.parentElement !== palco) palco.prepend(canvas3d);
  }

  // Teclado
  const mapaTeclas = {
    KeyW: 'frente',
    ArrowUp: 'frente',
    KeyS: 'tras',
    ArrowDown: 'tras',
    KeyA: 'esquerda',
    ArrowLeft: 'esquerda',
    KeyD: 'direita',
    ArrowRight: 'direita',
  };

  window.addEventListener('keydown', (e) => {
    if (estado.aba !== 'interiores' || estado.modo !== 'passeio') return;
    if (e.code === 'Escape') {
      estado.modo = '3d';
      salvar();
      aplicarModo();
      ctx.atualizarTudo();
      return;
    }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      teclas.add('correr');
      return;
    }
    const tecla = mapaTeclas[e.code];
    if (!tecla) return;
    e.preventDefault();
    teclas.add(tecla);
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') teclas.delete('correr');
    const tecla = mapaTeclas[e.code];
    if (tecla) teclas.delete(tecla);
  });

  elDpad.querySelectorAll('[data-dpad]').forEach((btn) => {
    const tecla = btn.dataset.dpad;
    const soltar = () => teclas.delete(tecla);
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      teclas.add(tecla);
      btn.setPointerCapture?.(e.pointerId);
    });
    btn.addEventListener('pointerup', soltar);
    btn.addEventListener('pointercancel', soltar);
    btn.addEventListener('pointerleave', soltar);
  });

  // Olhar arrastando
  canvas3d.addEventListener('pointerdown', (e) => {
    if (!emPasseio) return;
    olhando = true;
    ultimoPonteiro = { x: e.clientX, y: e.clientY };
    canvas3d.setPointerCapture?.(e.pointerId);
  });

  canvas3d.addEventListener('pointermove', (e) => {
    if (!olhando || !emPasseio) return;
    const dx = e.clientX - ultimoPonteiro.x;
    const dy = e.clientY - ultimoPonteiro.y;
    ultimoPonteiro = { x: e.clientX, y: e.clientY };
    passeio.yaw += dx * 0.0045;
    passeio.pitch = Math.max(-1.1, Math.min(1.1, passeio.pitch - dy * 0.004));
    aplicarCameraPasseio();
  });

  window.addEventListener('pointerup', () => {
    olhando = false;
  });

  /** Chamado a cada frame pelo main.js. */
  function aoFrame(dt) {
    if (!emPasseio || estado.modo !== 'passeio') return;
    const vel = (teclas.has('correr') ? 3.4 : 1.75) * Math.max(0, Math.min(dt, 0.1));
    let frente = 0;
    let lado = 0;
    if (teclas.has('frente')) frente += 1;
    if (teclas.has('tras')) frente -= 1;
    if (teclas.has('direita')) lado += 1;
    if (teclas.has('esquerda')) lado -= 1;
    if (frente || lado) {
      const fwd = { x: Math.sin(passeio.yaw), z: Math.cos(passeio.yaw) };
      const right = { x: Math.cos(passeio.yaw), z: -Math.sin(passeio.yaw) };
      const dx = (fwd.x * frente + right.x * lado) * vel;
      const dz = (fwd.z * frente + right.z * lado) * vel;
      const colisores = mundo.casa3d.colisores;
      const novo = moverComColisao(colisores, passeio.x, passeio.z, dx, dz, 0.24);
      const env = casa.envelope;
      passeio.x = Math.min(env.x1 - 0.2, Math.max(env.x0 + 0.2, novo.x));
      passeio.z = Math.min(env.z1 - 0.2, Math.max(env.z0 + 0.2, novo.z));
    }
    aplicarCameraPasseio();
  }

  // Redimensionamento
  const observador = new ResizeObserver(() => {
    if (estado.modo === 'planta') {
      ajustarCanvasPlanta();
      desenharPlanta();
    }
  });
  observador.observe(elPalco);

  // ============================ INICIALIZAÇÃO ============================
  if (!casa.rooms.some((r) => r.id === estado.comodoSelecionado)) {
    estado.comodoSelecionado = casa.rooms[0]?.id || null;
  }
  renderLista();
  renderEditor();
  aplicarModo();
  atualizarSol();
  desenharPlanta();

  return {
    aoFrame,
    atualizarSol,
    selecionar,
    renderTudo() {
      renderLista();
      renderEditor();
      aplicarModo();
      desenharPlanta();
    },
    aplicarModo,
    sairPasseio,
  };
}
