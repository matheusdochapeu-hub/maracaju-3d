import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  criarCasaPadrao,
  normalizarCasa,
  areaComodo,
  areaEnvelope,
  poligonoComodo,
  redeDeParedes,
  aberturasVisiveis,
  completudeComodo,
  completudeCasa,
  estatisticas,
  diagnosticarPlanta,
  pendencias,
  comodoNoPonto,
  colide,
  moverComColisao,
  limitarAoEnvelope,
  snap,
} from '../app/js/casa-modelo.js';

const bruto = JSON.parse(fs.readFileSync(new URL('../app/data/casa.json', import.meta.url), 'utf8'));
const casa = normalizarCasa(bruto);

test('a planta real tem 12 cômodos (incl. Lavanderia), sala pentagonal (5 arestas) e 94,75 m² dentro do envelope', () => {
  assert.equal(casa.origem, 'planta-real');
  assert.equal(casa.rooms.length, 12);
  const sala = casa.rooms.find((r) => r.id === 'sala');
  assert.equal(poligonoComodo(sala).length, 5);
  assert.equal(+areaComodo(sala).toFixed(2), 13.75);
  const lav = casa.rooms.find((r) => r.id === 'lavanderia');
  assert.ok(lav, 'deveria existir a área editável da Lavanderia');
  assert.equal(+areaComodo(lav).toFixed(2), 6);
  const bancadasLav = casa.moveis.filter((m) => m.comodoId === 'lavanderia' && m.catalogoId === 'bancada_marmore');
  assert.equal(bancadasLav.length, 1, 'lavanderia deveria ter a bancada de mármore apenas sob a janela (sem lateral direita da porta)');
  const soma = casa.rooms.reduce((total, r) => total + areaComodo(r), 0);
  assert.equal(+soma.toFixed(2), 94.75);
  assert.equal(+((casa.envelope.x1 - casa.envelope.x0).toFixed(2)), 5.2);
  assert.equal(+((casa.envelope.z1 - casa.envelope.z0).toFixed(2)), 19.2);
  assert.ok(soma <= areaEnvelope(casa.envelope));
  const diag = diagnosticarPlanta(casa);
  assert.deepEqual(diag.avisos, []);
  assert.equal(diag.areaLivre, 0);
});

test('nenhum cômodo se sobrepõe', () => {
  for (let i = 0; i < casa.rooms.length; i++) {
    for (let j = i + 1; j < casa.rooms.length; j++) {
      const a = casa.rooms[i];
      const b = casa.rooms[j];
      const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const iz = Math.min(a.z + a.d, b.z + b.d) - Math.max(a.z, b.z);
      assert.ok(ix <= 0.001 || iz <= 0.001, `${a.nome} e ${b.nome} se sobrepõem`);
    }
  }
});

test('as paredes externas fecham o envelope e deixam o alpendre totalmente aberto na frente', () => {
  const blocos = redeDeParedes(casa);
  assert.ok(blocos.length > 50);
  const externas = blocos.filter((b) => b.externa);
  const env = casa.envelope;

  const esquerda = externas.filter((b) => b.eixo === 'v' && Math.abs(b.coord - env.x0) < 0.01);
  assert.ok(esquerda.length > 0);
  assert.ok(Math.min(...esquerda.map((b) => b.ini)) <= env.z0 + 0.01);
  assert.ok(Math.max(...esquerda.map((b) => b.fim)) >= env.z1 - 0.01);

  const frente = externas.filter((b) => b.eixo === 'h' && Math.abs(b.coord - env.z1) < 0.01);
  // Nenhuma parede ou verga bloqueando a entrada aberta do alpendre (-1.75 a +0.25)
  const paredeNoAlpendre = frente.find((b) => b.ini < 0.2 && b.fim > -1.7);
  assert.equal(paredeNoAlpendre, undefined);
  // Escritório continua fechado até a borda direita
  assert.ok(frente.some((b) => Math.abs(b.fim - env.x1) < 0.01));
});

test('a passagem do corredor externo e lavanderia até o quintal é totalmente aberta (sem parede atravessando)', () => {
  const blocos = redeDeParedes(casa);
  const env = casa.envelope;
  const fundos = blocos.filter((b) => b.eixo === 'h' && Math.abs(b.coord - env.z0) < 0.01);
  const bloqueioCorredor = fundos.find((b) => b.ini < -0.3 && b.fim > -1.7);
  assert.equal(bloqueioCorredor, undefined);

  // Nenhuma parede horizontal atravessando as divisas da Lavanderia (z = -0.65 e z = -4.65) dentro do corredor (-1.75..-0.25)
  const bloqueioLavFrente = blocos.find((b) => b.eixo === 'h' && Math.abs(b.coord - -0.65) < 0.05 && b.ini < -0.3 && b.fim > -1.7);
  const bloqueioLavFundo = blocos.find((b) => b.eixo === 'h' && Math.abs(b.coord - -4.65) < 0.05 && b.ini < -0.3 && b.fim > -1.7);
  assert.equal(bloqueioLavFrente, undefined);
  assert.equal(bloqueioLavFundo, undefined);
});

test('muro esquerdo é divisa fechada (sem janelas para rua lateral) e janelas internas abrem para o corredor externo', () => {
  const aberturas = aberturasVisiveis(casa);
  const env = casa.envelope;
  const janelasMuroEsq = aberturas.filter((a) => a.tipo === 'janela' && a.eixo === 'v' && Math.abs(a.coord - env.x0) < 0.05);
  assert.equal(janelasMuroEsq.length, 0);

  const janelasCorredorExt = aberturas.filter((a) => a.tipo === 'janela' && a.eixo === 'v' && Math.abs(a.coord - -0.25) < 0.05);
  assert.equal(janelasCorredorExt.length, 5); // sala, cozinha, banheiro social rosa, banheiro suíte, quarto do fundo
});

test('aberturas e relações reais entre cômodos (9 portas/vãos e 6 janelas)', () => {
  const aberturas = aberturasVisiveis(casa);
  const portas = aberturas.filter((a) => a.tipo === 'porta');
  const janelas = aberturas.filter((a) => a.tipo === 'janela');
  assert.equal(portas.length, 9);
  assert.equal(janelas.length, 6);
  assert.ok(portas.every((p) => p.largura > 0.5));

  // Sala tem porta diagonal (menor aresta do pentágono) ao lado da porta perpendicular do corredor
  const portaDiag = portas.find((p) => p.comodo === 'sala' && p.eixo === 'd');
  assert.ok(portaDiag, 'deveria existir a porta diagonal da sala no chanfro');
  assert.equal(portaDiag.parede, 'chanfro');

  // Banheiro social rosa abre para o corredor interno (direita)
  const bSocial = casa.rooms.find((r) => r.id === 'banheiro');
  assert.equal(bSocial.portas[0].parede, 'direita');
  assert.equal(bSocial.janelas[0].parede, 'esquerda');

  // Banheiro da suíte abre para o quarto do fundo (fundo)
  const bSuite = casa.rooms.find((r) => r.id === 'banheiro2');
  assert.equal(bSuite.portas[0].parede, 'fundo');
  assert.equal(bSuite.janelas[0].parede, 'esquerda');
});

test('completude sobe conforme o cômodo é levantado', () => {
  const quarto = casa.rooms.find((r) => r.id === 'quarto1');
  const vazio = completudeComodo({ ...quarto, status: 'estimado', notas: '', portas: [], janelas: [], piso: 'nao_definido' }, 0);
  assert.ok(vazio.score < 20);
  const cheio = completudeComodo({ ...quarto, status: 'medido', notas: 'pintar' }, 8);
  assert.equal(cheio.score, 100);
  const parcial = completudeCasa(casa, {});
  assert.ok(parcial.geral > 40 && parcial.geral < 100);
});

test('estatísticas refletem a planta real', () => {
  const s = estatisticas(casa);
  assert.equal(s.largura, 5.2);
  assert.equal(s.comprimento, 19.2);
  assert.equal(s.peDireito, 2.7);
  assert.equal(s.portas, 9);
  assert.equal(s.janelas, 6);
  assert.equal(s.areaComodos, 94.8);
  assert.equal(s.areaJanelas, 6.36);
  assert.ok(s.ocupacao > 90 && s.ocupacao <= 100);
});

test('pendências apontam o que fazer e para qual cômodo', () => {
  const lista = pendencias(casa, {});
  assert.ok(lista.length >= 6);
  assert.ok(lista.some((p) => p.acao === 'captura'));
});

test('comodoNoPonto acha sala, lavanderia, corredor, quarto e o vazio', () => {
  assert.equal(comodoNoPonto(casa, 1.0, 1.3)?.id, 'sala');
  assert.equal(comodoNoPonto(casa, -1.0, 0.5)?.id, 'corredor');
  assert.equal(comodoNoPonto(casa, -1.0, -2.5)?.id, 'lavanderia');
  assert.equal(comodoNoPonto(casa, -1.0, -7.0)?.id, 'corredor_fundos');
  assert.equal(comodoNoPonto(casa, 1.5, 5.8)?.id, 'quarto1');
  assert.equal(comodoNoPonto(casa, -3.0, -1.7), null);
});

test('colisão e deslizamento contra uma parede', () => {
  const parede = [{ x0: 0, x1: 1, z0: 0, z1: 0.1 }];
  assert.equal(colide(parede, 0.5, 0.15, 0.2), true);
  assert.equal(colide(parede, 0.5, 0.6, 0.2), false);
  const andou = moverComColisao(parede, 0.5, 0.35, 0.2, -0.2, 0.2);
  assert.ok(andou.x > 0.5);
  assert.ok(andou.z >= 0.34);
});

test('limitarAoEnvelope mantém o cômodo dentro da casa', () => {
  const env = casa.envelope;
  const r = { x: -20, z: -20, w: 3, d: 3 };
  limitarAoEnvelope(r, env);
  assert.ok(r.x >= env.x0 && r.z >= env.z0);
  assert.ok(r.x + r.w <= env.x1);
  assert.ok(r.z + r.d <= env.z1);
});

test('snap arredonda para 5 cm', () => {
  assert.equal(snap(1.234), 1.25);
  assert.equal(snap(1.21), 1.2);
});

test('sem o casa.json o app abre com um cômodo de emergência', () => {
  const padrao = criarCasaPadrao();
  assert.equal(padrao.rooms.length, 1);
  assert.equal(padrao.origem, 'sem-origem');
  assert.equal(normalizarCasa(null).rooms.length, 1);
  assert.equal(normalizarCasa({ rooms: [] }).rooms.length, 1);
});

test('normalizarCasa nunca quebra com dados ruins', () => {
  const estranha = normalizarCasa({
    envelope: { x0: -3, x1: 'abc', z0: 0, z1: -5, peDireito: 99, altura: 1 },
    rooms: [{ id: 'x', nome: '', w: -4, d: 'a', portas: [{ parede: 'teto' }], janelas: 5 }],
  });
  assert.ok(estranha.envelope.x1 > estranha.envelope.x0);
  assert.ok(estranha.rooms[0].w > 0);
  assert.equal(estranha.rooms[0].portas[0].parede, 'esquerda');
});
