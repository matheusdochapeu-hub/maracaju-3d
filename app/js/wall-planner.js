/**
 * Estúdio de prévia sobre foto real (aberto pela aba Captura).
 * Permite subir fotos tiradas no celular (muro 15m, quintal ou interiores),
 * ler coordenadas GPS/azimute EXIF, calibrar escala real em metros,
 * arrastar/redimensionar prévias de plantas, irrigação, tanques e móveis,
 * e exportar imagem PNG para aprovação conjunta com a Scarlet.
 */

import { parseJpegExif } from './exif.js';

const PRESET_ITEMS = [
  { id: 'setor_a', label: '🌿 Floreira Setor A (Seco: Alecrim/Tomilho)', w: 180, h: 65, color: '#eab308', fill: 'rgba(234,179,8,0.28)' },
  { id: 'setor_b', label: '🪴 Floreira Setor B (Moderado: Ervas/Flores)', w: 200, h: 72, color: '#22c55e', fill: 'rgba(34,197,94,0.28)' },
  { id: 'setor_c', label: '💧 Vaso Isolado Setor C (Úmido: Hortelã)', w: 120, h: 80, color: '#38bdf8', fill: 'rgba(56,189,248,0.28)' },
  { id: 'trelica', label: '🍇 Treliça / Pergolado (Cabaça / Uva)', w: 220, h: 160, color: '#a855f7', fill: 'rgba(168,85,247,0.22)' },
  { id: 'gotejo', label: '💦 Linha Gotejamento PE 16mm', w: 320, h: 16, color: '#0ea5e9', fill: 'rgba(14,165,233,0.45)' },
  { id: 'peixes', label: '🐟 Tanque de Peixes / Biofiltro', w: 210, h: 130, color: '#06b6d4', fill: 'rgba(6,182,212,0.28)' },
  { id: 'oficina', label: '🛠️ Bancada / Painel Ferramentas', w: 230, h: 120, color: '#f97316', fill: 'rgba(249,115,22,0.28)' },
  { id: 'emergencia', label: '🚨 Armário Emergência 72h', w: 140, h: 185, color: '#ef4444', fill: 'rgba(239,68,68,0.28)' },
];


export function initWallPlanner(toastFn) {
  const canvas = document.getElementById('wallCanvas');
  const ctx = canvas.getContext('2d');
  const fileInput = document.getElementById('wallPhotoInput');
  const exifBox = document.getElementById('wallExifBox');
  const paletteEl = document.getElementById('wallPalette');
  const itemsListEl = document.getElementById('wallItemsList');
  const labelInput = document.getElementById('wallSelectedLabel');
  const btnDelete = document.getElementById('btnWallDelete');
  const btnClear = document.getElementById('btnWallClear');
  const btnExport = document.getElementById('btnWallExportPng');
  const btnCalibrate = document.getElementById('btnWallCalibrate');
  const scaleInfoEl = document.getElementById('wallScaleInfo');

  let bgImage = null;
  let bgName = 'muro-maracaju-88';
  let items = [];
  let selectedIdx = -1;
  let dragMode = null; // 'move' | 'resize'
  let dragOffset = { x: 0, y: 0 };
  let calibrating = false;
  let calPoints = [];
  let pxPerMeter = null;

  // Render palette buttons
  PRESET_ITEMS.forEach((p) => {
    const btn = document.createElement('button');
    btn.className = 'btn sm';
    btn.style.justifyContent = 'flex-start';
    btn.textContent = p.label;
    btn.addEventListener('click', () => {
      const cx = canvas.width * 0.5 - p.w * 0.5;
      const cy = canvas.height * 0.5 - p.h * 0.5;
      items.push({
        label: p.label,
        x: Math.max(20, cx + (items.length % 5) * 18),
        y: Math.max(20, cy + (items.length % 5) * 18),
        w: p.w,
        h: p.h,
        color: p.color,
        fill: p.fill,
      });
      selectedIdx = items.length - 1;
      syncSelectedUI();
      draw();
    });
    paletteEl.appendChild(btn);
  });

  function drawPlaceholderWall() {
    canvas.width = 1100;
    canvas.height = 620;
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#172536');
    grad.addColorStop(0.75, '#1e293b');
    grad.addColorStop(0.75, '#141a21');
    grad.addColorStop(1, '#0f141a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle wall bricks guide
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let y = 40; y < canvas.height * 0.75; y += 36) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(148,163,184,0.75)';
    ctx.font = 'bold 20px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🧱 Muro Esquerdo — Casa Maracaju 88 (Modo Esboço)', canvas.width / 2, 110);
    ctx.font = '14px Segoe UI, sans-serif';
    ctx.fillStyle = 'rgba(148,163,184,0.6)';
    ctx.fillText('Carregue uma foto real tirada no celular à esquerda para testar prévias em cima da foto real!', canvas.width / 2, 140);
    ctx.textAlign = 'left';
  }

  function draw() {
    if (bgImage) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    } else {
      drawPlaceholderWall();
    }

    // Calibration line
    if (calPoints.length === 2) {
      ctx.save();
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(calPoints[0].x, calPoints[0].y);
      ctx.lineTo(calPoints[1].x, calPoints[1].y);
      ctx.stroke();
      ctx.fillStyle = '#facc15';
      calPoints.forEach((pt) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.font = 'bold 13px Segoe UI';
      ctx.fillText('Ref: 1,00 m', (calPoints[0].x + calPoints[1].x) / 2 + 8, (calPoints[0].y + calPoints[1].y) / 2 - 8);
      ctx.restore();
    }

    items.forEach((it, idx) => {
      ctx.save();
      ctx.fillStyle = it.fill;
      ctx.strokeStyle = idx === selectedIdx ? '#ffffff' : it.color;
      ctx.lineWidth = idx === selectedIdx ? 3 : 2;
      ctx.fillRect(it.x, it.y, it.w, it.h);
      ctx.strokeRect(it.x, it.y, it.w, it.h);

      // Label pill
      ctx.fillStyle = 'rgba(9, 14, 20, 0.85)';
      const dimText = pxPerMeter
        ? ` (${(it.w / pxPerMeter).toFixed(2)}m × ${(it.h / pxPerMeter).toFixed(2)}m)`
        : '';
      const fullLabel = it.label + dimText;
      ctx.font = 'bold 12px Segoe UI, sans-serif';
      const tw = Math.min(ctx.measureText(fullLabel).width + 14, Math.max(it.w, 160));
      ctx.fillRect(it.x, Math.max(0, it.y - 22), tw, 20);
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(fullLabel, it.x + 6, Math.max(14, it.y - 8));

      // Resize handle bottom-right
      if (idx === selectedIdx) {
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(it.x + it.w - 12, it.y + it.h - 12, 12, 12);
      }
      ctx.restore();
    });
  }

  function syncSelectedUI() {
    itemsListEl.innerHTML = '';
    items.forEach((it, idx) => {
      const div = document.createElement('div');
      div.className = 'comodo-item' + (idx === selectedIdx ? ' ativo' : '');
      div.innerHTML = `<span class="ponto" style="background:${it.color}"></span><div class="texto"><div class="nome">${it.label}</div></div>`;
      div.addEventListener('click', () => {
        selectedIdx = idx;
        syncSelectedUI();
        draw();
      });
      itemsListEl.appendChild(div);
    });

    if (selectedIdx >= 0 && items[selectedIdx]) {
      labelInput.value = items[selectedIdx].label;
      labelInput.disabled = false;
      btnDelete.disabled = false;
    } else {
      labelInput.value = '';
      labelInput.disabled = true;
      btnDelete.disabled = true;
    }
  }

  function getCanvasPos(evt) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (evt.clientX - rect.left) * scaleX,
      y: (evt.clientY - rect.top) * scaleY,
    };
  }

  canvas.addEventListener('pointerdown', (e) => {
    const pt = getCanvasPos(e);
    if (calibrating) {
      calPoints.push(pt);
      if (calPoints.length === 2) {
        const dist = Math.hypot(calPoints[1].x - calPoints[0].x, calPoints[1].y - calPoints[0].y);
        if (dist > 10) {
          pxPerMeter = dist;
          scaleInfoEl.textContent = `Escala calibrada: ${Math.round(pxPerMeter)} px = 1,00 m`;
          toastFn('Escala calibrada! Agora cada elemento mostra largura × altura em metros.');
        }
        calibrating = false;
        btnCalibrate.classList.remove('active-chip');
      }
      draw();
      return;
    }

    // Check top-most hit
    selectedIdx = -1;
    dragMode = null;
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      if (pt.x >= it.x + it.w - 16 && pt.x <= it.x + it.w + 6 && pt.y >= it.y + it.h - 16 && pt.y <= it.y + it.h + 6) {
        selectedIdx = i;
        dragMode = 'resize';
        break;
      }
      if (pt.x >= it.x && pt.x <= it.x + it.w && pt.y >= it.y && pt.y <= it.y + it.h) {
        selectedIdx = i;
        dragMode = 'move';
        dragOffset = { x: pt.x - it.x, y: pt.y - it.y };
        break;
      }
    }
    syncSelectedUI();
    draw();
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!dragMode || selectedIdx < 0) return;
    const pt = getCanvasPos(e);
    const it = items[selectedIdx];
    if (dragMode === 'move') {
      it.x = pt.x - dragOffset.x;
      it.y = pt.y - dragOffset.y;
    } else if (dragMode === 'resize') {
      it.w = Math.max(24, pt.x - it.x);
      it.h = Math.max(14, pt.y - it.y);
    }
    draw();
  });

  window.addEventListener('pointerup', () => {
    dragMode = null;
  });

  labelInput.addEventListener('input', () => {
    if (selectedIdx >= 0 && items[selectedIdx]) {
      items[selectedIdx].label = labelInput.value;
      draw();
    }
  });

  btnDelete.addEventListener('click', () => {
    if (selectedIdx >= 0) {
      items.splice(selectedIdx, 1);
      selectedIdx = -1;
      syncSelectedUI();
      draw();
    }
  });

  btnClear.addEventListener('click', () => {
    items = [];
    selectedIdx = -1;
    syncSelectedUI();
    draw();
  });

  btnCalibrate.addEventListener('click', () => {
    calibrating = !calibrating;
    calPoints = [];
    btnCalibrate.classList.toggle('active-chip', calibrating);
    if (calibrating) {
      toastFn('Clique nos 2 extremos de uma trena/referência de 1,00 m na foto.');
    }
    draw();
  });

  btnExport.addEventListener('click', () => {
    const prevSel = selectedIdx;
    selectedIdx = -1;
    draw();
    const link = document.createElement('a');
    link.download = `previa-${bgName.replace(/\.[^.]+$/, '')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    selectedIdx = prevSel;
    draw();
    toastFn('Prévia PNG baixada! Pronta para revisar com a Scarlet.');
  });

  function loadPhotoFromUrl(url, name, metaText) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      bgImage = img;
      bgName = name || 'foto-muro';
      const maxW = 1280;
      const ratio = img.width > maxW ? maxW / img.width : 1;
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      pxPerMeter = null;
      calPoints = [];
      scaleInfoEl.textContent = 'Escala não calibrada (use a régua 1m)';
      if (metaText) exifBox.innerHTML = metaText;
      draw();
      toastFn(`Foto carregada no Estúdio do Muro: ${bgName}`);
    };
    img.src = url;
  }

  async function handlePhotoFile(file) {
    if (!file) return;
    bgName = file.name || 'foto-camera-muro.jpg';

    // Parse EXIF GPS/Compass
    try {
      const buf = await file.arrayBuffer();
      const exif = parseJpegExif(buf);
      if (exif && (exif.lat !== null || exif.compass !== null || exif.date)) {
        exifBox.innerHTML = `
          <strong>📍 EXIF Detectado (${bgName})</strong><br>
          GPS: ${exif.lat !== null ? `${exif.lat}, ${exif.lng}` : 'Sem GPS na foto'}<br>
          Bússola: ${exif.compass !== null ? `${exif.compass}°` : 'Não gravada'}<br>
          Data: ${exif.date || '—'}
        `;
      } else {
        exifBox.innerHTML = `<strong>📷 ${bgName}</strong><br>Sem tags GPS EXIF (ative "Salvar localização" na câmera do celular para georreferenciar).`;
      }
    } catch {
      exifBox.innerHTML = `<strong>📷 ${bgName}</strong> carregada.`;
    }

    const url = URL.createObjectURL(file);
    loadPhotoFromUrl(url, bgName);
  }

  fileInput.addEventListener('change', (e) => handlePhotoFile(e.target.files?.[0]));
  const camInput = document.getElementById('wallCameraInput');
  if (camInput) {
    camInput.addEventListener('change', (e) => handlePhotoFile(e.target.files?.[0]));
  }

  draw();
  syncSelectedUI();

  return { loadPhotoFromUrl };
}
