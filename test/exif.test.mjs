import test from 'node:test';
import assert from 'node:assert/strict';
import { parseJpegExif, gpsParaLocal } from '../app/js/exif.js';

test('arquivo que não é JPEG devolve null em vez de quebrar', () => {
  assert.equal(parseJpegExif(new ArrayBuffer(0)), null);
  assert.equal(parseJpegExif(codificador('nao sou jpeg')), null);
});

test('JPEG sem APP1 também devolve null', () => {
  const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9, 0, 0, 0, 0]);
  assert.equal(parseJpegExif(bytes.buffer), null);
});

test('GPS do endereço vira distância zero da origem', () => {
  const local = gpsParaLocal(-21.1742, -47.8339, { lat: -21.1742, lng: -47.8339, azimute: 40 });
  assert.equal(local.distancia, 0);
  assert.equal(local.x, 0);
  assert.equal(Math.abs(local.z), 0);
});

test('andar ~11 m para o norte aumenta a distância', () => {
  const local = gpsParaLocal(-21.1741, -47.8339, { lat: -21.1742, lng: -47.8339, azimute: 0 });
  assert.ok(local.distancia > 10 && local.distancia < 13);
  assert.ok(local.z < -10, 'norte é -z no referencial do lote');
});

function codificador(texto) {
  return new TextEncoder().encode(texto).buffer;
}
