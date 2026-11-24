/**
 * utils.js — Utilidades pequenas e sem estado.
 */

export function baixarArquivo(nome, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function baixarTexto(nome, texto, tipo = 'text/plain;charset=utf-8') {
  baixarArquivo(nome, new Blob([texto], { type: tipo }));
}

export function escaparHtml(texto) {
  return String(texto ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function metros(valor, casas = 2) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return '—';
  return `${n.toFixed(casas).replace('.', ',')} m`;
}

export function area(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return '—';
  return `${n.toFixed(1).replace('.', ',')} m²`;
}

export function dataHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function hojeISO() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function limitar(v, a, b) {
  return Math.min(b, Math.max(a, v));
}

export function debounce(fn, ms = 120) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function vibrar(ms = 12) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* sem vibração, sem problema */
  }
}

export function bytesLegivel(n) {
  if (!Number.isFinite(n) || n <= 0) return '0 MB';
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
