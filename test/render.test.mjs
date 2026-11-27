import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ACABAMENTOS,
  CATALOGO_TEXTURAS,
  SUGESTOES_REFORMA,
  buscarTexturas,
  linksPesquisaTextura,
  texturaPorId,
} from '../app/js/texturas.js';
import { criarCasaPadrao, normalizarCasa } from '../app/js/casa-modelo.js';

test('catálogo de texturas cobre piso, parede e móvel/eletro sem IDs duplicados', () => {
  const pisos = CATALOGO_TEXTURAS.filter((t) => t.camada === 'piso');
  const paredes = CATALOGO_TEXTURAS.filter((t) => t.camada === 'parede');
  const moveis = CATALOGO_TEXTURAS.filter((t) => t.camada === 'movel');
  assert.ok(pisos.length >= 10, 'esperado >= 10 texturas de piso');
  assert.ok(paredes.length >= 10, 'esperado >= 10 texturas de parede');
  assert.ok(moveis.length >= 10, 'esperado >= 10 texturas de móveis/eletros');

  const ids = new Set(CATALOGO_TEXTURAS.map((t) => t.id));
  assert.equal(ids.size, CATALOGO_TEXTURAS.length);
  for (const t of CATALOGO_TEXTURAS) {
    assert.ok(ACABAMENTOS[t.acabamento], `acabamento inválido em ${t.id}`);
  }
});

test('buscarTexturas ignora acentos e filtra por camada', () => {
  const marmores = buscarTexturas('piso', 'marmore');
  assert.ok(marmores.length >= 1);
  assert.ok(marmores.every((t) => t.camada === 'piso'));

  const inox = buscarTexturas('movel', 'inox');
  assert.ok(inox.length >= 2);
  assert.ok(inox.every((t) => t.camada === 'movel'));
});

test('todas as sugestões de reforma apontam para texturas existentes no catálogo', () => {
  assert.ok(SUGESTOES_REFORMA.length >= 5);
  for (const sug of SUGESTOES_REFORMA) {
    assert.ok(texturaPorId(sug.piso), `piso inválido na sugestão ${sug.id}`);
    assert.ok(texturaPorId(sug.parede), `parede inválida na sugestão ${sug.id}`);
    assert.ok(texturaPorId(sug.movelSugerido), `móvel inválido na sugestão ${sug.id}`);
  }
});

test('linksPesquisaTextura gera URLs válidas de pesquisa na internet', () => {
  const links = linksPesquisaTextura('porcelanato madeira', 'piso');
  assert.ok(links.google.startsWith('https://www.google.com/search?'));
  assert.ok(links.polyhaven.startsWith('https://polyhaven.com/textures?'));
  assert.ok(links.ambientcg.startsWith('https://ambientcg.com/list?'));
  assert.ok(links.unsplash.startsWith('https://unsplash.com/s/photos/'));
});

test('normalizarCasa preserva casa.materiais para piso, parede e móvel', () => {
  const base = criarCasaPadrao();
  base.materiais = {
    'piso:sala': {
      texturaId: 'piso_marmore_calacatta',
      fotoUrl: null,
      rep: 2.5,
      acabamento: 'polido',
      rotulo: 'Calacatta',
    },
    'movel:mov_sofa_sala': {
      texturaId: null,
      fotoUrl: 'data:image/jpeg;base64,AAAA',
      rep: 1,
      acabamento: 'fosco',
      rotulo: 'Foto sofá',
    },
  };
  const norm = normalizarCasa(base);
  assert.equal(norm.materiais['piso:sala'].texturaId, 'piso_marmore_calacatta');
  assert.equal(norm.materiais['piso:sala'].rep, 2.5);
  assert.equal(norm.materiais['movel:mov_sofa_sala'].fotoUrl, 'data:image/jpeg;base64,AAAA');
  assert.equal(norm.materiais['movel:mov_sofa_sala'].acabamento, 'fosco');
});
