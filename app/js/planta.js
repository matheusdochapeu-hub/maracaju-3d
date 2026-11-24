/**
 * planta.js — Conta de escala da planta de fundo (a imagem que você joga por
 * baixo dos cômodos na aba Interiores).
 *
 * Fica separado do DOM para poder ser testado: a única coisa que importa é
 * "quantos metros tem cada pixel da imagem" e como a calibragem por dois
 * pontos corrige esse número.
 */

export const FUNDO_PADRAO = {
  temImagem: false,
  opacidade: 45,
  rot: 0,
  metrosPorPixel: null,
  offsetX: 0,
  offsetZ: 0,
  larguraPx: 0,
  alturaPx: 0,
};

export function normalizarFundo(bruto) {
  const f = { ...FUNDO_PADRAO, ...(bruto || {}) };
  const numero = (v, padrao) => (Number.isFinite(Number(v)) ? Number(v) : padrao);
  return {
    temImagem: Boolean(f.temImagem),
    opacidade: Math.min(90, Math.max(5, numero(f.opacidade, 45))),
    rot: [0, 90, 180, 270].includes(Number(f.rot)) ? Number(f.rot) : 0,
    metrosPorPixel:
      Number.isFinite(Number(f.metrosPorPixel)) && Number(f.metrosPorPixel) > 0
        ? Math.min(0.5, Math.max(0.0005, Number(f.metrosPorPixel)))
        : null,
    offsetX: Math.min(20, Math.max(-20, numero(f.offsetX, 0))),
    offsetZ: Math.min(20, Math.max(-20, numero(f.offsetZ, 0))),
    larguraPx: Math.max(0, numero(f.larguraPx, 0)),
    alturaPx: Math.max(0, numero(f.alturaPx, 0)),
  };
}

/** Escala inicial: a largura da imagem cobre a largura da casa. */
export function escalaInicial(larguraImagemPx, larguraCasaM) {
  const px = Number(larguraImagemPx);
  const m = Number(larguraCasaM);
  if (!(px > 0) || !(m > 0)) return null;
  return m / px;
}

/**
 * Depois de marcar dois pontos na planta, o usuário informa a distância real
 * entre eles. A escala antiga continua valendo como referência, então:
 *
 *   nova = antiga × (distância real / distância que o app mediu)
 */
export function escalaCalibrada(metrosPorPixel, distanciaMedidaNoApp, distanciaReal) {
  const mpp = Number(metrosPorPixel);
  const medida = Number(distanciaMedidaNoApp);
  const real = Number(distanciaReal);
  if (!(mpp > 0) || !(medida > 0.02) || !(real > 0.02)) return mpp > 0 ? mpp : null;
  return Math.min(0.5, Math.max(0.0005, mpp * (real / medida)));
}

/** Tamanho da imagem no plano, em metros. */
export function tamanhoEmMetros(metrosPorPixel, larguraPx, alturaPx) {
  const mpp = Number(metrosPorPixel);
  if (!(mpp > 0)) return { largura: 0, altura: 0 };
  return { largura: larguraPx * mpp, altura: alturaPx * mpp };
}
