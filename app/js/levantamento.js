/**
 * levantamento.js — Aba Dados: progresso, ficha da casa, pendências e backup.
 *
 * É a leitura "de engenharia" do mesmo modelo: áreas, janelas, portas,
 * percentual medido e o que ainda falta. Também exporta a ficha em Markdown
 * para levar para a obra ou para o arquiteto.
 */

import { areaComodo, completudeCasa, diagnosticarPlanta, estatisticas, limitarAoEnvelope, pendencias, TIPOS_COMODO, PISOS } from './casa-modelo.js';
import { escaparHtml, metros, dataHora, baixarTexto } from './utils.js';

export function iniciarLevantamento(ctx) {
  const { estado, casa, toast } = ctx;
  const elProgresso = document.getElementById('painelProgresso');
  const elAnel = document.getElementById('anelProgresso');
  const elNumero = document.getElementById('progressoNumero');
  const elTexto = document.getElementById('progressoTexto');
  const elFicha = document.getElementById('painelFicha');
  const elAviso = document.getElementById('avisoPlanta');
  const elTabela = document.getElementById('tabelaComodos');
  const elPendencias = document.getElementById('listaPendencias');
  const inputs = {
    largura: document.getElementById('envLargura'),
    comprimento: document.getElementById('envComprimento'),
    peDireito: document.getElementById('envPeDireito'),
    altura: document.getElementById('envAltura'),
  };

  function renderTudo() {
    const fotos = ctx.contarFotos();
    const comp = completudeCasa(casa, fotos);
    const stats = estatisticas(casa);
    const diag = diagnosticarPlanta(casa);

    elAnel.style.setProperty('--p', comp.geral);
    elNumero.textContent = `${comp.geral}%`;
    const medidos = casa.rooms.filter((r) => r.status === 'medido').length;
    const totalFotos = Object.values(fotos).reduce((a, b) => a + b, 0);
    elTexto.textContent = `${medidos} de ${casa.rooms.length} cômodos medidos · ${totalFotos} foto${
      totalFotos === 1 ? '' : 's'
    } capturadas · atualizado ${dataHora(estado.atualizadoEm)}`;

    elProgresso.innerHTML = comp.comodos
      .map(
        (c) => `
        <div class="progresso-item">
          <div>
            <div class="nome"><b>${escaparHtml(c.nome)}</b><span>${c.area.toFixed(1).replace('.', ',')} m²</span></div>
            <div class="barra-mini"><i style="width:${c.score}%"></i></div>
          </div>
          <span class="num" style="text-align:right">${c.score}%</span>
        </div>`
      )
      .join('');

    elFicha.innerHTML = `
      <div class="stat"><span>Área da casa</span><b>${stats.areaEnvelope.toFixed(1).replace('.', ',')} m²</b></div>
      <div class="stat"><span>Área dos cômodos</span><b>${stats.areaComodos.toFixed(1).replace('.', ',')} m²</b></div>
      <div class="stat"><span>Ocupação da planta</span><b>${stats.ocupacao}%</b></div>
      <div class="stat"><span>Pé-direito</span><b>${stats.peDireito.toFixed(2).replace('.', ',')} m</b></div>
      <div class="stat"><span>Área de janelas</span><b>${stats.areaJanelas.toFixed(2).replace('.', ',')} m²</b></div>
      <div class="stat"><span>Portas / janelas</span><b>${stats.portas} / ${stats.janelas}</b></div>
    `;

    if (diag.avisos.length) {
      elAviso.className = 'alerta';
      elAviso.textContent = diag.avisos.join(' ');
    } else {
      elAviso.className = 'alerta ok';
      elAviso.textContent = 'Planta fechada, sem sobreposição. Boa base para simular a obra.';
    }

    elTabela.querySelector('tbody').innerHTML = casa.rooms
      .map(
        (r) => `
        <tr>
          <td><b>${escaparHtml(r.nome)}</b><br><span class="ajuda">${TIPOS_COMODO[r.tipo] || ''} · ${PISOS[r.piso]?.nome || ''}</span></td>
          <td class="num">${metros(r.w)}</td>
          <td class="num">${metros(r.d)}</td>
          <td class="num">${areaComodo(r).toFixed(1).replace('.', ',')} m²</td>
          <td class="num">${r.portas.length}</td>
          <td class="num">${r.janelas.length}</td>
          <td><span class="selo ${r.status === 'medido' ? 'medido' : ''}">${r.status}</span></td>
          <td><button class="btn sm" data-abrir-comodo="${escaparHtml(r.id)}">Abrir</button></td>
        </tr>`
      )
      .join('');

    const lista = pendencias(casa, fotos).slice(0, 14);
    elPendencias.innerHTML = lista.length
      ? lista
          .map(
            (p) => `
        <div class="pendencia">
          <span>${escaparHtml(p.texto)}</span>
          <span class="linha" style="gap:5px">
            <span class="etiqueta">${p.acao === 'captura' ? 'foto' : p.acao === 'medir' ? 'medida' : 'editar'}</span>
            <button class="btn sm" data-pendencia="${p.acao}" data-comodo="${escaparHtml(p.comodoId || '')}">Ir</button>
          </span>
        </div>`
          )
          .join('')
      : '<p class="ajuda">Tudo completo! Agora dá para planejar a reforma com o pé no chão.</p>';

    inputs.largura.value = (casa.envelope.x1 - casa.envelope.x0).toFixed(2);
    inputs.comprimento.value = (casa.envelope.z1 - casa.envelope.z0).toFixed(2);
    inputs.peDireito.value = casa.envelope.peDireito.toFixed(2);
    inputs.altura.value = casa.envelope.altura.toFixed(2);

    const origem = {
      estimado: 'estimada',
      projeto: 'do projeto',
      importado: 'importada',
      medido: 'medida no local',
      'sem-origem': 'sem origem declarada',
    }[casa.origem] || casa.origem || 'estimada';
    const fonte = casa.fonte ? ` · ${casa.fonte}` : '';
    document.getElementById('modeloOrigem').textContent = `Planta ${origem}${fonte}${
      casa.atualizadoEm ? ` · atualizada em ${dataHora(casa.atualizadoEm)}` : ''
    }`;
  }

  elTabela.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-abrir-comodo]');
    if (!btn) return;
    ctx.irParaComodo(btn.dataset.abrirComodo);
  });

  elPendencias.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-pendencia]');
    if (!btn) return;
    const acao = btn.dataset.pendencia;
    const id = btn.dataset.comodo;
    if (acao === 'captura') {
      ctx.irParaAba('captura');
      ctx.abrirCamera(id || estado.areaCamera || 'sala');
      return;
    }
    ctx.irParaComodo(id || estado.comodoSelecionado);
  });

  document.getElementById('btnAplicarEnvelope').addEventListener('click', () => {
    const largura = Number(inputs.largura.value);
    const comprimento = Number(inputs.comprimento.value);
    const peDireito = Number(inputs.peDireito.value);
    const altura = Number(inputs.altura.value);
    if (!(largura > 1 && comprimento > 1)) {
      toast('Informe largura e comprimento maiores que 1 m.');
      return;
    }
    const env = casa.envelope;
    env.x1 = env.x0 + largura;
    env.z1 = env.z0 + comprimento;
    env.peDireito = Math.min(4, Math.max(2.2, peDireito || 2.7));
    env.altura = Math.min(5, Math.max(env.peDireito + 0.05, altura || env.peDireito + 0.2));
    for (const r of casa.rooms) limitarAoEnvelope(r, env);
    ctx.aplicarCasa();
    toast('Medidas do envelope aplicadas. Confira se algum cômodo ficou fora do lugar.');
  });

  document.getElementById('btnExportarJson').addEventListener('click', () => ctx.exportarJson());
  document.getElementById('inputImportarJson').addEventListener('change', async (e) => {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (arquivo) await ctx.importarJson(arquivo);
  });

  document.getElementById('btnBaixarModelo').addEventListener('click', () => ctx.exportarModelo());
  document.getElementById('btnModeloProjeto').addEventListener('click', () => ctx.carregarModeloDoProjeto());
  document.getElementById('inputModeloJson').addEventListener('change', async (e) => {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (arquivo) await ctx.importarModelo(arquivo);
  });

  document.getElementById('btnExportarFicha').addEventListener('click', () => {
    const stats = estatisticas(casa);
    const comp = completudeCasa(casa, ctx.contarFotos());
    const linhas = [
      `# Casa Maracaju 88 — ficha do levantamento`,
      '',
      `Atualizado em: ${new Date().toLocaleString('pt-BR')}`,
      `Endereço: Rua Maracaju, 88 — Vila Tibério, Ribeirão Preto/SP`,
      `Coordenadas: ${estado.lat}, ${estado.lng} · giro do lote ${estado.lotAzimuth}°`,
      '',
      `## Resumo`,
      '',
      `- Área do envelope: **${stats.areaEnvelope} m²** (${stats.largura} × ${stats.comprimento} m)`,
      `- Área dos cômodos: **${stats.areaComodos} m²**`,
      `- Pé-direito: **${stats.peDireito} m**`,
      `- Área de janelas: **${stats.areaJanelas} m²**`,
      `- Portas: ${stats.portas} · Janelas: ${stats.janelas}`,
      `- Levantamento: **${comp.geral}%**`,
      '',
      `## Cômodos`,
      '',
      '| Cômodo | Tipo | Largura | Profundidade | Área | Portas | Janelas | Status |',
      '| --- | --- | --- | --- | --- | --- | --- | --- |',
      ...casa.rooms.map(
        (r) =>
          `| ${r.nome} | ${TIPOS_COMODO[r.tipo] || ''} | ${r.w.toFixed(2)} m | ${r.d.toFixed(2)} m | ${areaComodo(r).toFixed(
            2
          )} m² | ${r.portas.length} | ${r.janelas.length} | ${r.status} |`
      ),
      '',
      `## Portas e janelas`,
      '',
      ...casa.rooms.flatMap((r) => {
        const itens = [
          ...r.portas.map(
            (p) => `- **${r.nome}** · porta na parede ${p.parede}, início ${p.inicio} m, ${p.largura} m × ${p.altura} m`
          ),
          ...r.janelas.map(
            (j) =>
              `- **${r.nome}** · janela na parede ${j.parede}, início ${j.inicio} m, ${j.largura} m × ${j.altura} m, peitoril ${j.peitoril} m`
          ),
        ];
        return itens;
      }),
      '',
      `## Anotações de reforma`,
      '',
      ...casa.rooms.filter((r) => r.notas.trim()).map((r) => `- **${r.nome}**: ${r.notas}`),
      '',
      `## Pendências`,
      '',
      ...pendencias(casa, ctx.contarFotos()).map((p) => `- [ ] ${p.texto}`),
      '',
      `> Gerado pelo Maracaju 3D. Medidas estimadas até serem marcadas como "medido".`,
    ];
    baixarTexto(`maracaju-88-ficha-${new Date().toISOString().slice(0, 10)}.md`, linhas.join('\n'), 'text/markdown;charset=utf-8');
    toast('Ficha em Markdown baixada.');
  });

  document.getElementById('btnResetar').addEventListener('click', () => {
    if (!confirm('Apagar medições, módulos e ajustes deste dispositivo e voltar à planta estimada? As fotos continuam salvas.')) return;
    ctx.resetar();
  });

  return { renderTudo };
}
