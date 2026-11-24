import test from 'node:test';
import assert from 'node:assert/strict';
import { crc32, criarZip } from '../app/js/zip.js';

const codificador = new TextEncoder();

test('CRC32 confere com o vetor clássico', () => {
  assert.equal(crc32(codificador.encode('123456789')), 0xcbf43926);
  assert.equal(crc32(new Uint8Array()), 0);
});

test('cria um zip válido com nomes e conteúdo', async () => {
  const zip = await criarZip([
    { nome: 'fotos/sala/01.jpg', dados: codificador.encode('conteudo-da-foto') },
    { nome: 'manifest.json', dados: codificador.encode('{"ok":true}') },
  ]);
  assert.equal(zip.type, 'application/zip');
  const bytes = new Uint8Array(await zip.arrayBuffer());
  assert.equal(bytes[0], 0x50);
  assert.equal(bytes[1], 0x4b);
  assert.equal(bytes[2], 0x03);
  assert.equal(bytes[3], 0x04);
  const texto = new TextDecoder('latin1').decode(bytes);
  assert.ok(texto.includes('fotos/sala/01.jpg'));
  assert.ok(texto.includes('manifest.json'));
  assert.ok(texto.includes('conteudo-da-foto'));
  // Assinatura do diretório central e do fim do arquivo
  assert.ok(texto.includes('PK\u0001\u0002'));
  assert.ok(texto.includes('PK\u0005\u0006'));
});
