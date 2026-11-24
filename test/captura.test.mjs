import test from 'node:test';
import assert from 'node:assert/strict';

import { detectarArea } from '../app/js/captura.js';

test('detecta a área pelo nome do arquivo', () => {
  const casos = {
    'IMG_20261124_sala.jpg': 'sala',
    'Sala - janela.JPG': 'sala',
    'quarto1_parede_norte.jpg': 'quarto1',
    'Quarto 2 - guarda-roupa.png': 'quarto2',
    'banheiro_box.jpg': 'banheiro',
    'cozinha-e-copa.jpg': 'cozinha',
    'corredor_portas.jpg': 'corredor',
    'muro_15m_parte2.jpg': 'muro',
    'fundos-obra.jpg': 'fundos',
    'fachada_frente.jpg': 'frente',
    'IMG_0001.jpg': null,
    'planta_baixa.png': null,
  };
  for (const [nome, esperado] of Object.entries(casos)) {
    assert.equal(detectarArea(nome), esperado, `arquivo ${nome}`);
  }
});

test('não confunde quarto 2 com quarto 1', () => {
  assert.equal(detectarArea('quarto2.jpg'), 'quarto2');
  assert.equal(detectarArea('quarto-2.jpg'), 'quarto2');
  assert.equal(detectarArea('quarto1.jpg'), 'quarto1');
  assert.equal(detectarArea('suite 2.jpg'), 'quarto2');
});
