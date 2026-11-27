import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  CATALOGO_MOVEIS,
  montarCatalogo,
  buscarCatalogo,
  criarMovelNoComodo,
  normalizarMovel,
  gerarMoveisIniciaisDaCasa,
} from '../app/js/moveis-catalogo.js';
import { normalizarCasa } from '../app/js/casa-modelo.js';

const bruto = JSON.parse(fs.readFileSync(new URL('../app/data/casa.json', import.meta.url), 'utf8'));
const casa = normalizarCasa(bruto);

test('catálogo padrão inclui móveis e eletrodomésticos de todas as categorias', () => {
  assert.ok(CATALOGO_MOVEIS.length >= 35);
  for (const cat of ['sala', 'quarto', 'cozinha', 'banheiro', 'eletro']) {
    assert.ok(
      CATALOGO_MOVEIS.some((m) => m.categoria === cat),
      `deveria existir item na categoria ${cat}`
    );
  }
});

test('busca no catálogo ignora acentos e filtra por categoria', () => {
  const todos = montarCatalogo();
  const sofas = buscarCatalogo(todos, 'sofa', 'todos');
  assert.ok(sofas.length >= 3);
  const fogoes = buscarCatalogo(todos, 'fogao', 'eletro');
  assert.ok(fogoes.length >= 1);
  const nada = buscarCatalogo(todos, 'geladeira', 'banheiro');
  assert.equal(nada.length, 0);
});

test('montarCatalogo aplica edições de itens padrão e inclui itens criados pelo usuário', () => {
  const cat = montarCatalogo(
    { sofa_3l: { nome: 'Sofá da Scarlet', w: 2.4 } },
    [{ id: 'custom-1', nome: 'Cristaleira vintage', categoria: 'personalizado', forma: 'armario', w: 0.9, d: 0.4, h: 1.9, y: 0, cor: '#a16207' }]
  );
  const editado = cat.find((x) => x.id === 'sofa_3l');
  assert.equal(editado.nome, 'Sofá da Scarlet');
  assert.equal(editado.w, 2.4);
  const criado = buscarCatalogo(cat, 'cristaleira', 'personalizado');
  assert.equal(criado.length, 1);
  assert.equal(criado[0].padrao, false);
});

test('casa.json recebe móveis iniciais editáveis automaticamente', () => {
  assert.ok(Array.isArray(casa.moveis));
  assert.ok(casa.moveis.length >= 12);
  assert.ok(casa.moveis.some((m) => m.comodoId === 'sala' && m.forma === 'sofa'));
  assert.ok(casa.moveis.some((m) => m.comodoId === 'cozinha' && m.forma === 'geladeira'));
  assert.ok(casa.moveis.some((m) => m.comodoId === 'quarto1' && m.forma === 'mesa'));
  assert.ok(casa.moveis.some((m) => m.comodoId === 'quarto2' && m.forma === 'cama'));
});

test('inserir, mover e limpar móveis preserva consistência no normalizarCasa', () => {
  const sala = casa.rooms.find((r) => r.id === 'sala');
  const tv = CATALOGO_MOVEIS.find((x) => x.id === 'tv_55');
  const novo = criarMovelNoComodo(tv, sala, casa.moveis);
  assert.equal(novo.comodoId, 'sala');
  assert.equal(novo.forma, 'tv');
  assert.ok(novo.x >= 0 && novo.x <= sala.w);
  assert.ok(novo.z >= 0 && novo.z <= sala.d);

  // normalizarMovel protege contra limites absurdos
  const clamped = normalizarMovel({ ...novo, x: 99, z: -10, w: -5, rot: 450 }, casa.rooms);
  assert.equal(clamped.x, sala.w);
  assert.equal(clamped.z, 0);
  assert.ok(clamped.w >= 0.12);
  assert.equal(clamped.rot, 90);

  // Se o usuário apagar todos os móveis ([]), normalizarCasa respeita lista vazia
  const vazia = normalizarCasa({ ...bruto, moveis: [] });
  assert.equal(vazia.moveis.length, 0);
  assert.ok(gerarMoveisIniciaisDaCasa(vazia.rooms).length >= 12);
});
