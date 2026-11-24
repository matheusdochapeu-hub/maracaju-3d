/**
 * exif.js — Leitura de GPS, bússola e data do EXIF de fotos JPEG.
 *
 * Feito em JavaScript puro (sem biblioteca) para rodar no celular sem
 * depender do servidor Python. Usado em dois lugares:
 *  - Estúdio de prévia: mostra GPS/bússola da foto escolhida;
 *  - Captura: calcula a distância da foto até a casa.
 */

const RAD = Math.PI / 180;

/** @returns {{lat:number|null,lng:number|null,compass:number|null,date:string|null}|null} */
export function parseJpegExif(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  if (view.byteLength < 12 || view.getUint16(0, false) !== 0xffd8) return null;

  let offset = 2;
  let guarda = 0;
  while (offset + 4 < view.byteLength && guarda++ < 200) {
    const marcador = view.getUint16(offset, false);
    offset += 2;
    if (marcador === 0xffe1) {
      const comprimento = view.getUint16(offset, false);
      if (comprimento < 2 || offset + comprimento > view.byteLength) return null;
      const assinatura =
        String.fromCharCode(view.getUint8(offset + 2)) +
        String.fromCharCode(view.getUint8(offset + 3)) +
        String.fromCharCode(view.getUint8(offset + 4)) +
        String.fromCharCode(view.getUint8(offset + 5));
      if (assinatura !== 'Exif') {
        offset += comprimento;
        continue;
      }

      const inicioTiff = offset + 8;
      if (inicioTiff + 8 > view.byteLength) return null;
      const little = view.getUint16(inicioTiff, false) === 0x4949;
      const deslocPrimeiraIfd = view.getUint32(inicioTiff + 4, little);
      const ifd0 = lerIfd(view, inicioTiff, inicioTiff + deslocPrimeiraIfd, little);

      const resultado = { lat: null, lng: null, compass: null, date: null };
      if (ifd0[0x0132]) resultado.date = ifd0[0x0132];
      if (typeof ifd0[0x8769] === 'number') {
        const exifIfd = lerIfd(view, inicioTiff, inicioTiff + ifd0[0x8769], little);
        if (exifIfd[0x9003]) resultado.date = exifIfd[0x9003];
      }
      if (typeof ifd0[0x8825] === 'number') {
        const gps = lerIfd(view, inicioTiff, inicioTiff + ifd0[0x8825], little);
        if (gps[0x0002] && gps[0x0001]) {
          const lat = dmsParaDecimal(gps[0x0002], gps[0x0001]);
          if (Number.isFinite(lat)) resultado.lat = lat;
        }
        if (gps[0x0004] && gps[0x0003]) {
          const lng = dmsParaDecimal(gps[0x0004], gps[0x0003]);
          if (Number.isFinite(lng)) resultado.lng = lng;
        }
        if (typeof gps[0x0011] === 'number' && Number.isFinite(gps[0x0011])) {
          resultado.compass = +gps[0x0011].toFixed(1);
        }
      }
      return resultado;
    }
    if ((marcador & 0xff00) !== 0xff00) return null;
    const tamanho = view.getUint16(offset, false);
    if (tamanho < 2) return null;
    offset += tamanho;
  }
  return null;
}

function lerIfd(view, inicioTiff, inicioDir, little) {
  const tags = {};
  if (inicioDir + 2 > view.byteLength) return tags;
  const entradas = view.getUint16(inicioDir, little);
  for (let i = 0; i < entradas; i++) {
    const pos = inicioDir + 2 + i * 12;
    if (pos + 12 > view.byteLength) break;
    const tag = view.getUint16(pos, little);
    const tipo = view.getUint16(pos + 2, little);
    const contagem = view.getUint32(pos + 4, little);
    const campoValor = pos + 8;

    if (tipo === 2) {
      const inicio = contagem <= 4 ? campoValor : inicioTiff + view.getUint32(campoValor, little);
      if (inicio + contagem <= view.byteLength) {
        let s = '';
        for (let c = 0; c < contagem - 1; c++) s += String.fromCharCode(view.getUint8(inicio + c));
        tags[tag] = s.trim();
      }
    } else if (tipo === 4 && contagem === 1) {
      tags[tag] = view.getUint32(campoValor, little);
    } else if (tipo === 5) {
      const inicio = inicioTiff + view.getUint32(campoValor, little);
      if (inicio + contagem * 8 <= view.byteLength) {
        if (contagem === 1) {
          const n = view.getUint32(inicio, little);
          const d = view.getUint32(inicio + 4, little);
          tags[tag] = d ? n / d : 0;
        } else {
          const arr = [];
          for (let r = 0; r < contagem; r++) {
            const n = view.getUint32(inicio + r * 8, little);
            const d = view.getUint32(inicio + r * 8 + 4, little);
            arr.push(d ? n / d : 0);
          }
          tags[tag] = arr;
        }
      }
    }
  }
  return tags;
}

function dmsParaDecimal(dms, ref) {
  if (!Array.isArray(dms) || dms.length < 3) return NaN;
  let dec = dms[0] + dms[1] / 60 + dms[2] / 3600;
  if (ref === 'S' || ref === 'W') dec = -dec;
  return +dec.toFixed(6);
}

/**
 * Converte GPS em posição local (leste/norte em metros) e distância até a casa.
 * O azimute do lote gira o eixo para o mesmo referencial do 3D.
 */
export function gpsParaLocal(lat, lng, origem = { lat: -21.1742, lng: -47.8339, azimute: 40 }) {
  const raioTerra = 6378137;
  const dLat = (lat - origem.lat) * RAD;
  const dLng = (lng - origem.lng) * RAD;
  const norte = dLat * raioTerra;
  const leste = dLng * raioTerra * Math.cos(origem.lat * RAD);
  const az = origem.azimute * RAD;
  return {
    distancia: +Math.hypot(leste, norte).toFixed(1),
    x: +(leste * Math.cos(az) - norte * Math.sin(az)).toFixed(2),
    z: -(leste * Math.sin(az) + norte * Math.cos(az)).toFixed(2),
  };
}
