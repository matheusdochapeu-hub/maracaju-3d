import test from 'node:test';
import assert from 'node:assert/strict';

import { FUNDO_PADRAO, normalizarFundo, escalaInicial, escalaCalibrada, tamanhoEmMetros } from '../app/js/planta.js';

test('escala inicial encaixa a imagem na largura da casa', () => {
  assert.equal(escalaInicial(1000, 4.8), 0.0048);
  assert.equal(escalaInicial(0, 4.8), null);
  assert.equal(escalaInicial(1000, 0), null);
});

test('calibragem corrige a escala pela distância real', () => {
  assert.equal(escalaCalibrada(0.01, 3, 3), 0.01);
  assert.equal(escalaCalibrada(0.01, 3, 6), 0.02);
  assert.equal(escalaCalibrada(0.01, 6, 3), 0.005);
  // valores absurdos não estouram os limites
  assert.equal(escalaCalibrada(0.01, 0.1, 1000), 0.5);
  assert.equal(escalaCalibrada(0.01, 10000, 0.1), 0.0005);
});

test('calibragem sem dados válidos devolve a escala anterior', () => {
  assert.equal(escalaCalibrada(0.02, 0, 3), 0.02);
  assert.equal(escalaCalibrada(0, 3, 3), null);
});

test('normalizarFundo protege contra valores ruins', () => {
  const f = normalizarFundo({ opacidade: 500, rot: 45, metrosPorPixel: -3, offsetX: 'a' });
  assert.equal(f.opacidade, 90);
  assert.equal(f.rot, 0);
  assert.equal(f.metrosPorPixel, null);
  assert.equal(f.offsetX, 0);
  assert.deepEqual(normalizarFundo(), FUNDO_PADRAO);
});

test('tamanho em metros usa a escala da imagem', () => {
  assert.deepEqual(tamanhoEmMetros(0.01, 400, 200), { largura: 4, altura: 2 });
  assert.deepEqual(tamanhoEmMetros(null, 400, 200), { largura: 0, altura: 0 });
});
