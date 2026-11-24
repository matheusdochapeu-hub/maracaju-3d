/**
 * Motor Astronômico Solar (baseado nas equações NOAA / mourner/suncalc)
 * Calcula azimute (0°=N, 90°=L, 180°=S, 270°=O) e elevação solar em graus
 * para qualquer latitude, longitude e data/hora (sem dependências externas).
 */

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const DAY_MS = 1000 * 60 * 60 * 24;
const J1970 = 2440588;
const J2000 = 2451545;
const OBLIQUITY = 23.4397 * RAD;

function toJulian(date) {
  return date.valueOf() / DAY_MS - 0.5 + J1970;
}

function toDays(date) {
  return toJulian(date) - J2000;
}

function rightAscension(l, b) {
  return Math.atan2(
    Math.sin(l) * Math.cos(OBLIQUITY) - Math.tan(b) * Math.sin(OBLIQUITY),
    Math.cos(l)
  );
}

function declination(l, b) {
  return Math.asin(
    Math.sin(b) * Math.cos(OBLIQUITY) +
      Math.cos(b) * Math.sin(OBLIQUITY) * Math.sin(l)
  );
}

function siderealTime(d, lw) {
  return RAD * (280.16 + 360.9856235 * d) - lw;
}

function solarMeanAnomaly(d) {
  return RAD * (357.5291 + 0.98560028 * d);
}

function eclipticLongitude(M) {
  const C =
    RAD *
    (1.9148 * Math.sin(M) +
      0.02 * Math.sin(2 * M) +
      0.0003 * Math.sin(3 * M));
  const P = RAD * 102.9372; // periélio da Terra
  return M + C + P + Math.PI;
}

function sunCoords(d) {
  const M = solarMeanAnomaly(d);
  const L = eclipticLongitude(M);
  return {
    dec: declination(L, 0),
    ra: rightAscension(L, 0),
  };
}

/**
 * Retorna a posição solar para uma data/hora UTC e lat/lng em graus decimais.
 * - azimuthDeg: 0° = Norte, 90° = Leste, 180° = Sul, 270° = Oeste
 * - altitudeDeg: ângulo acima do horizonte (-90° a +90°)
 */
export function getSunPosition(date, lat, lng) {
  const lw = -lng * RAD;
  const phi = lat * RAD;
  const d = toDays(date);

  const c = sunCoords(d);
  const H = siderealTime(d, lw) - c.ra;

  // Azimute medido do Sul para Oeste (padrão astronômico)
  const azSouth = Math.atan2(
    Math.sin(H),
    Math.cos(H) * Math.sin(phi) - Math.tan(c.dec) * Math.cos(phi)
  );
  const alt = Math.asin(
    Math.sin(phi) * Math.sin(c.dec) +
      Math.cos(phi) * Math.cos(c.dec) * Math.cos(H)
  );

  // Converter azimute para bússola (0°=Norte, sentido horário)
  let azimuthDeg = (azSouth * DEG + 180) % 360;
  if (azimuthDeg < 0) azimuthDeg += 360;

  return {
    azimuthDeg,
    altitudeDeg: alt * DEG,
    azimuthRad: azimuthDeg * RAD,
    altitudeRad: alt,
  };
}

/**
 * Cria um objeto Date para o fuso de Brasília (UTC-3) dado ano, mês (1-12), dia e hora decimal (ex: 9.5 = 09:30).
 */
export function makeBRTDate(year, month, day, decimalHour) {
  const hours = Math.floor(decimalHour);
  const minutes = Math.round((decimalHour - hours) * 60);
  // UTC = BRT + 3h
  return new Date(Date.UTC(year, month - 1, day, hours + 3, minutes, 0));
}

/**
 * Gera a curva solar completa do dia (de 05:00 a 19:00 a cada 15 min) + nascer, zênite e pôr do sol.
 */
export function getDaySolarCurve(year, month, day, lat, lng) {
  const points = [];
  let sunrise = null;
  let sunset = null;
  let maxAlt = -90;
  let solarNoonHour = 12;

  for (let m = 5 * 60; m <= 19 * 60; m += 10) {
    const h = m / 60;
    const dt = makeBRTDate(year, month, day, h);
    const pos = getSunPosition(dt, lat, lng);
    points.push({ hour: h, ...pos });

    if (pos.altitudeDeg > maxAlt) {
      maxAlt = pos.altitudeDeg;
      solarNoonHour = h;
    }
    if (sunrise === null && pos.altitudeDeg >= 0) {
      sunrise = h;
    }
    if (pos.altitudeDeg >= 0) {
      sunset = h;
    }
  }

  return {
    points,
    sunrise: sunrise ?? 6.0,
    sunset: sunset ?? 18.0,
    maxAlt,
    solarNoonHour,
    daylightHours: sunrise && sunset ? +(sunset - sunrise).toFixed(1) : 12.0,
  };
}

/**
 * Converte posição solar (azimute bússola + elevação) em vetor 3D Three.js
 * Convenção da cena: -Z = Norte, +Z = Sul, +X = Leste, -X = Oeste, +Y = Cima
 */
export function sunToVector3(azimuthRad, altitudeRad, radius = 40) {
  const cosAlt = Math.cos(altitudeRad);
  return {
    x: radius * cosAlt * Math.sin(azimuthRad),
    y: radius * Math.sin(altitudeRad),
    z: -radius * cosAlt * Math.cos(azimuthRad),
  };
}

export function formatHour(decimalHour) {
  const h = Math.floor(decimalHour);
  const m = Math.round((decimalHour - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m === 60 ? 0 : m).padStart(2, '0')}`;
}

export function compassLabel(deg) {
  const dirs = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'];
  return dirs[Math.round(((deg % 360) / 45)) % 8];
}
