/**
 * zip.js — Gera um arquivo .zip sem bibliotecas externas.
 *
 * Usa o método "store" (sem compressão): as fotos já saem comprimidas da
 * câmera, então recomprimir só gastaria CPU no celular. O resultado abre em
 * qualquer Windows, macOS, Android ou no Google Colab.
 */

const TABELA_CRC = (() => {
  const tabela = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabela[n] = c >>> 0;
  }
  return tabela;
})();

export function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = TABELA_CRC[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dataHoraDos(d) {
  const hora = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const data = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { hora, data };
}

/**
 * @param {Array<{nome: string, dados: Uint8Array|ArrayBuffer|Blob}>} arquivos
 * @returns {Promise<Blob>}
 */
export async function criarZip(arquivos) {
  const codificador = new TextEncoder();
  const agora = new Date();
  const { hora, data } = dataHoraDos(agora);
  const partes = [];
  const centrais = [];
  let deslocamento = 0;

  for (const arquivo of arquivos) {
    const nome = codificador.encode(arquivo.nome.replace(/\\/g, '/'));
    let dados;
    if (arquivo.dados instanceof Blob) {
      dados = new Uint8Array(await arquivo.dados.arrayBuffer());
    } else if (arquivo.dados instanceof Uint8Array) {
      dados = arquivo.dados;
    } else {
      dados = new Uint8Array(arquivo.dados);
    }
    const crc = crc32(dados);

    const cabecalho = new Uint8Array(30 + nome.length);
    const v = new DataView(cabecalho.buffer);
    v.setUint32(0, 0x04034b50, true);
    v.setUint16(4, 20, true);
    v.setUint16(6, 0x0800, true); // nomes em UTF-8
    v.setUint16(8, 0, true); // store
    v.setUint16(10, hora, true);
    v.setUint16(12, data, true);
    v.setUint32(14, crc, true);
    v.setUint32(18, dados.length, true);
    v.setUint32(22, dados.length, true);
    v.setUint16(26, nome.length, true);
    v.setUint16(28, 0, true);
    cabecalho.set(nome, 30);

    partes.push(cabecalho, dados);

    const central = new Uint8Array(46 + nome.length);
    const c = new DataView(central.buffer);
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(8, 0x0800, true);
    c.setUint16(10, 0, true);
    c.setUint16(12, hora, true);
    c.setUint16(14, data, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, dados.length, true);
    c.setUint32(24, dados.length, true);
    c.setUint16(28, nome.length, true);
    c.setUint16(30, 0, true);
    c.setUint16(32, 0, true);
    c.setUint16(34, 0, true);
    c.setUint16(36, 0, true);
    c.setUint32(38, 0, true);
    c.setUint32(42, deslocamento, true);
    central.set(nome, 46);
    centrais.push(central);

    deslocamento += cabecalho.length + dados.length;
  }

  let tamanhoCentral = 0;
  for (const c of centrais) tamanhoCentral += c.length;

  const fim = new Uint8Array(22);
  const f = new DataView(fim.buffer);
  f.setUint32(0, 0x06054b50, true);
  f.setUint16(4, 0, true);
  f.setUint16(6, 0, true);
  f.setUint16(8, centrais.length, true);
  f.setUint16(10, centrais.length, true);
  f.setUint32(12, tamanhoCentral, true);
  f.setUint32(16, deslocamento, true);
  f.setUint16(20, 0, true);

  return new Blob([...partes, ...centrais, fim], { type: 'application/zip' });
}
