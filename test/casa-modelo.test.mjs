import test from 'node:test';
import assert from 'node:assert/strict';

import {
  criarCasaPadrao,
  normalizarCasa,
  areaComodo,
  areaEnvelope,
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

const casa = criarCasaPadrao();

test('a planta de partida tem 6 cômodos que cobrem o envelope', () => {
  assert.equal(casa.rooms.length, 6);
  const soma = casa.rooms.reduce((total, r) => total + areaComodo(r), 0);
  const envelope = areaEnvelope(casa.envelope);
  assert.ok(soma > envelope * 0.9, `cômodos (${soma} m²) deveriam ocupar quase todo o envelope (${envelope} m²)`);
  assert.ok(soma <= envelope, 'a soma dos cômodos não pode passar do envelope');
  const diag = diagnosticarPlanta(casa);
  assert.deepEqual(diag.avisos, []);
  assert.ok(diag.areaLivre < 1.5);
});

test('nenhum cômodo de partida se sobrepõe', () => {
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

test('as paredes externas fecham o envelope nas quatro laterais', () => {
  const blocos = redeDeParedes(casa);
  assert.ok(blocos.length > 20);
  const externas = blocos.filter((b) => b.externa);
  assert.ok(externas.length > 0);
  const env = casa.envelope;

  const esquerda = externas.filter((b) => b.eixo === 'v' && Math.abs(b.coord - env.x0) < 0.01);
  assert.ok(esquerda.length > 0, 'deveria existir a parede externa esquerda');
  assert.ok(Math.min(...esquerda.map((b) => b.ini)) <= env.z0 + 0.01);
  assert.ok(Math.max(...esquerda.map((b) => b.fim)) >= env.z1 - 0.01);

  const frente = externas.filter((b) => b.eixo === 'h' && Math.abs(b.coord - env.z1) < 0.01);
  assert.ok(frente.some((b) => Math.abs(b.ini - env.x0) < 0.01));
  assert.ok(frente.some((b) => Math.abs(b.fim - env.x1) < 0.01));
});

test('a porta da sala vira verga (vão livre) na parede da frente', () => {
  const blocos = redeDeParedes(casa);
  const env = casa.envelope;
  const frente = blocos.filter((b) => b.eixo === 'h' && Math.abs(b.coord - env.z1) < 0.01);
  const verga = frente.find((b) => b.yBase > 2 && b.ini <= -1 && b.fim >= -0.1);
  assert.ok(verga, 'deveria existir uma verga sobre a porta da sala');
  const paredeNoVao = frente.find((b) => b.tipo === 'parede' && b.ini < -0.99 && b.fim > -0.11);
  assert.equal(paredeNoVao, undefined, 'o vão da porta não pode ser preenchido até o chão');
});

test('janelas deixam peitoril e verga, com vão no meio', () => {
  const blocos = redeDeParedes(casa);
  const env = casa.envelope;
  const esquerda = blocos.filter((b) => b.eixo === 'v' && Math.abs(b.coord - env.x0) < 0.01);
  assert.ok(esquerda.some((b) => b.tipo === 'peitoril' && b.yTopo <= 1.7));
  assert.ok(esquerda.some((b) => b.tipo === 'verga' && b.yBase >= 1.5));
});

test('aberturas: 7 portas e 5 janelas nos dados de partida', () => {
  const aberturas = aberturasVisiveis(casa);
  const portas = aberturas.filter((a) => a.tipo === 'porta');
  const janelas = aberturas.filter((a) => a.tipo === 'janela');
  assert.equal(portas.length, 7);
  assert.equal(janelas.length, 5);
  assert.ok(portas.every((p) => p.largura > 0.5));
});

test('completude sobe conforme o cômodo é levantado', () => {
  const sala = casa.rooms.find((r) => r.id === 'sala');
  const vazio = completudeComodo({ ...sala, status: 'estimado', notas: '', portas: [], janelas: [], piso: 'nao_definido' }, 0);
  assert.ok(vazio.score < 20);
  const cheio = completudeComodo({ ...sala, status: 'medido', notas: 'trocar janela' }, 8);
  assert.equal(cheio.score, 100);
  const casa_ = completudeCasa(casa, { sala: 8 });
  assert.ok(casa_.geral > 0 && casa_.geral < 100);
});

test('estatísticas refletem as medidas reais do envelope', () => {
  const s = estatisticas(casa);
  assert.equal(s.largura, 4.8);
  assert.equal(s.comprimento, 15);
  assert.equal(s.peDireito, 2.7);
  assert.equal(s.portas, 7);
  assert.equal(s.janelas, 5);
  assert.ok(s.areaJanelas > 5 && s.areaJanelas < 15);
  assert.ok(s.ocupacao > 90 && s.ocupacao <= 100);
});

test('pendências apontam o que fazer e para qual cômodo', () => {
  const lista = pendencias(casa, {});
  assert.ok(lista.length >= 6);
  assert.ok(lista.some((p) => p.acao === 'medir'));
  assert.ok(lista.some((p) => p.acao === 'captura'));
  assert.ok(lista.every((p) => typeof p.texto === 'string' && p.texto.length > 5));
});

test('comodoNoPonto acha sala, corredor e o vazio', () => {
  assert.equal(comodoNoPonto(casa, -0.5, 6)?.id, 'sala');
  assert.equal(comodoNoPonto(casa, 2.4, 0)?.id, 'corredor');
  assert.equal(comodoNoPonto(casa, -2.6, 0), null);
});

test('colisão e deslizamento contra uma parede', () => {
  const parede = [{ x0: 0, x1: 1, z0: 0, z1: 0.1 }];
  assert.equal(colide(parede, 0.5, 0.15, 0.2), true);
  assert.equal(colide(parede, 0.5, 0.6, 0.2), false);
  const andou = moverComColisao(parede, 0.5, 0.35, 0.2, -0.2, 0.2);
  assert.ok(andou.x > 0.5, 'deveria deslizar no eixo X');
  assert.ok(andou.z >= 0.34, 'não deveria atravessar a parede');
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

test('normalizarCasa nunca quebra com dados ruins', () => {
  assert.equal(normalizarCasa(null).rooms.length, 6);
  assert.equal(normalizarCasa({ rooms: [] }).rooms.length, 6);
  const estranha = normalizarCasa({
    envelope: { x0: -3, x1: 'abc', z0: 0, z1: -5, peDireito: 99, altura: 1 },
    rooms: [{ id: 'x', nome: '', w: -4, d: 'a', portas: [{ parede: 'teto' }], janelas: 5 }],
  });
  assert.ok(estranha.envelope.x1 > estranha.envelope.x0);
  assert.ok(estranha.rooms[0].w > 0);
  assert.ok(estranha.rooms[0].portas.length <= 1);
  assert.equal(estranha.rooms[0].portas[0].parede, 'esquerda');
});
