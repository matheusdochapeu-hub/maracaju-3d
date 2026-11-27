/**
 * texturas.js — Catálogo de texturas PBR (Pisos, Paredes, Móveis e Eletros),
 * sugestões de reforma prontas e gerador procedural em Canvas 2D (zero downloads externos!).
 *
 * A parte de dados/busca é 100% pura (testável em Node); o gerador Canvas/Three só
 * usa `document.createElement('canvas')` quando chamado no navegador.
 */

export const ACABAMENTOS = {
  fosco: { nome: 'Fosco', roughness: 0.88, metalness: 0.02 },
  acetinado: { nome: 'Acetinado', roughness: 0.52, metalness: 0.06 },
  polido: { nome: 'Polido / Brilho', roughness: 0.18, metalness: 0.12 },
  metalico: { nome: 'Metálico / Inox', roughness: 0.28, metalness: 0.72 },
};

/** Texturas prontas por camada: 'piso' | 'parede' | 'movel' */
export const CATALOGO_TEXTURAS = [
  // ================= PISOS =================
  { id: 'piso_porcelanato_claro', camada: 'piso', nome: 'Porcelanato polido bege', padrao: 'azulejo', cor1: '#dfd8cc', cor2: '#cfc7b8', rejunte: '#b5ada0', rep: 3, acabamento: 'polido' },
  { id: 'piso_marmore_calacatta', camada: 'piso', nome: 'Porcelanato mármore Calacatta', padrao: 'marmore', cor1: '#f3f1ed', cor2: '#c5bfb5', rejunte: '#d6d1c8', rep: 2, acabamento: 'polido' },
  { id: 'piso_cimento_queimado', camada: 'piso', nome: 'Cimento queimado moderno', padrao: 'cimento', cor1: '#9aa0a6', cor2: '#7f878f', rejunte: '#888f96', rep: 2, acabamento: 'acetinado' },
  { id: 'piso_madeira_carvalho', camada: 'piso', nome: 'Madeira carvalho (réguas)', padrao: 'madeira', cor1: '#b88758', cor2: '#9a6b41', rejunte: '#6b4728', rep: 3, acabamento: 'acetinado' },
  { id: 'piso_laminado_freijo', camada: 'piso', nome: 'Vinílico / Laminado freijó', padrao: 'madeira', cor1: '#c89e72', cor2: '#ad8257', rejunte: '#845e3b', rep: 3, acabamento: 'acetinado' },
  { id: 'piso_taco_espinha', camada: 'piso', nome: 'Taco madeira espinha de peixe', padrao: 'taco', cor1: '#a66d3f', cor2: '#8a542c', rejunte: '#5c361a', rep: 3, acabamento: 'polido' },
  { id: 'piso_ceramica_classica', camada: 'piso', nome: 'Cerâmica bege clássica', padrao: 'azulejo', cor1: '#cbb494', cor2: '#bca382', rejunte: '#8e7c66', rep: 5, acabamento: 'acetinado' },
  { id: 'piso_ceramica_rosa', camada: 'piso', nome: 'Cerâmica rosa antiga (atual)', padrao: 'azulejo', cor1: '#eab2c8', cor2: '#dc9db6', rejunte: '#c48ea3', rep: 6, acabamento: 'polido' },
  { id: 'piso_ladrilho_hidraulico', camada: 'piso', nome: 'Ladrilho hidráulico geométrico', padrao: 'ladrilho', cor1: '#e8e4dc', cor2: '#3b6d8c', rejunte: '#9aa3ad', rep: 5, acabamento: 'fosco' },
  { id: 'piso_porcelanato_cinza', camada: 'piso', nome: 'Porcelanato cinza urbano', padrao: 'azulejo', cor1: '#8e959c', cor2: '#7e868e', rejunte: '#676e75', rep: 3, acabamento: 'acetinado' },
  { id: 'piso_terracota', camada: 'piso', nome: 'Cerâmica terracota / barro', padrao: 'azulejo', cor1: '#b86847', cor2: '#9f5538', rejunte: '#7d4b37', rep: 5, acabamento: 'fosco' },
  { id: 'piso_ardosia', camada: 'piso', nome: 'Pedra ardósia escura', padrao: 'cimento', cor1: '#4a525a', cor2: '#373e45', rejunte: '#2c3238', rep: 3, acabamento: 'acetinado' },

  // ================= PAREDES =================
  { id: 'par_branco_gelo', camada: 'parede', nome: 'Pintura branco gelo', padrao: 'pintura', cor1: '#f1f3f5', cor2: '#e7eaee', rejunte: '#e7eaee', rep: 2, acabamento: 'fosco' },
  { id: 'par_offwhite', camada: 'parede', nome: 'Pintura off-white / algodão', padrao: 'pintura', cor1: '#f0ebe1', cor2: '#e5dfd3', rejunte: '#e5dfd3', rep: 2, acabamento: 'fosco' },
  { id: 'par_areia', camada: 'parede', nome: 'Pintura areia quente', padrao: 'pintura', cor1: '#dfd3c0', cor2: '#d2c4ae', rejunte: '#d2c4ae', rep: 2, acabamento: 'fosco' },
  { id: 'par_verde_salvia', camada: 'parede', nome: 'Pintura verde sálvia', padrao: 'pintura', cor1: '#9eb19f', cor2: '#8ea390', rejunte: '#8ea390', rep: 2, acabamento: 'fosco' },
  { id: 'par_azul_petroleo', camada: 'parede', nome: 'Pintura azul petróleo', padrao: 'pintura', cor1: '#35586c', cor2: '#2b4a5b', rejunte: '#2b4a5b', rep: 2, acabamento: 'fosco' },
  { id: 'par_terracota', camada: 'parede', nome: 'Pintura terracota suave', padrao: 'pintura', cor1: '#c67d63', cor2: '#b66c53', rejunte: '#b66c53', rep: 2, acabamento: 'fosco' },
  { id: 'par_cinza_urbano', camada: 'parede', nome: 'Pintura cinza claro', padrao: 'pintura', cor1: '#c7cdd4', cor2: '#b9c0c8', rejunte: '#b9c0c8', rep: 2, acabamento: 'fosco' },
  { id: 'par_cimento_queimado', camada: 'parede', nome: 'Cimento queimado na parede', padrao: 'cimento', cor1: '#a5abb2', cor2: '#899098', rejunte: '#899098', rep: 2, acabamento: 'acetinado' },
  { id: 'par_azulejo_metro', camada: 'parede', nome: 'Azulejo metrô branco (subway)', padrao: 'metro', cor1: '#f7f9fb', cor2: '#eef2f6', rejunte: '#94a3b8', rep: 5, acabamento: 'polido' },
  { id: 'par_azulejo_rosa', camada: 'parede', nome: 'Azulejo retrô rosa (social)', padrao: 'azulejo', cor1: '#f2b8cf', cor2: '#e7a4be', rejunte: '#e2d9dd', rep: 6, acabamento: 'polido' },
  { id: 'par_tijolinho', camada: 'parede', nome: 'Tijolinho aparente terracota', padrao: 'tijolo', cor1: '#a9583e', cor2: '#8c422c', rejunte: '#cfc6ba', rep: 4, acabamento: 'fosco' },
  { id: 'par_ripado_madeira', camada: 'parede', nome: 'Painel ripado madeira freijó', padrao: 'ripado', cor1: '#b88352', cor2: '#8c5c33', rejunte: '#4c3018', rep: 4, acabamento: 'acetinado' },
  { id: 'par_marmore_claro', camada: 'parede', nome: 'Revestimento mármore branco', padrao: 'marmore', cor1: '#f5f4f0', cor2: '#c8c3ba', rejunte: '#dedad2', rep: 2, acabamento: 'polido' },
  { id: 'par_linho', camada: 'parede', nome: 'Papel de parede linho bege', padrao: 'tecido', cor1: '#e4dccf', cor2: '#d5cbb9', rejunte: '#d5cbb9', rep: 6, acabamento: 'fosco' },

  // ================= MÓVEIS & ELETRODOMÉSTICOS =================
  { id: 'mov_freijo', camada: 'movel', nome: 'Madeira freijó natural', padrao: 'madeira', cor1: '#b98656', cor2: '#9a6b3f', rejunte: '#774f2b', rep: 2, acabamento: 'acetinado' },
  { id: 'mov_carvalho', camada: 'movel', nome: 'Madeira carvalho claro', padrao: 'madeira', cor1: '#d2b28c', cor2: '#ba976e', rejunte: '#95734e', rep: 2, acabamento: 'acetinado' },
  { id: 'mov_nogueira', camada: 'movel', nome: 'Madeira nogueira escura', padrao: 'madeira', cor1: '#6e472d', cor2: '#52331f', rejunte: '#3a2214', rep: 2, acabamento: 'acetinado' },
  { id: 'mov_laca_branca', camada: 'movel', nome: 'Laca branco fosco', padrao: 'pintura', cor1: '#f4f6f8', cor2: '#eceff2', rejunte: '#eceff2', rep: 1, acabamento: 'acetinado' },
  { id: 'mov_laca_preta', camada: 'movel', nome: 'Preto fosco moderno', padrao: 'pintura', cor1: '#232830', cor2: '#1b1f26', rejunte: '#1b1f26', rep: 1, acabamento: 'acetinado' },
  { id: 'mov_linho_cinza', camada: 'movel', nome: 'Tecido linho cinza', padrao: 'tecido', cor1: '#8b939c', cor2: '#737c86', rejunte: '#737c86', rep: 5, acabamento: 'fosco' },
  { id: 'mov_boucle_bege', camada: 'movel', nome: 'Tecido bouclé bege claro', padrao: 'tecido', cor1: '#dfd7c8', cor2: '#ccc2b0', rejunte: '#ccc2b0', rep: 6, acabamento: 'fosco' },
  { id: 'mov_suede_terracota', camada: 'movel', nome: 'Suede terracota', padrao: 'tecido', cor1: '#b46248', cor2: '#9b4f38', rejunte: '#9b4f38', rep: 5, acabamento: 'fosco' },
  { id: 'mov_veludo_verde', camada: 'movel', nome: 'Veludo verde musgo', padrao: 'tecido', cor1: '#486655', cor2: '#395244', rejunte: '#395244', rep: 5, acabamento: 'fosco' },
  { id: 'mov_couro_caramelo', camada: 'movel', nome: 'Couro caramelo', padrao: 'cimento', cor1: '#9c5a2d', cor2: '#7f4520', rejunte: '#7f4520', rep: 2, acabamento: 'acetinado' },
  { id: 'mov_inox', camada: 'movel', nome: 'Aço inox escovado (Eletros)', padrao: 'inox', cor1: '#cfd6dd', cor2: '#aeb7c0', rejunte: '#95a0aa', rep: 2, acabamento: 'metalico' },
  { id: 'mov_inox_preto', camada: 'movel', nome: 'Black Inox / Grafite (Eletros)', padrao: 'inox', cor1: '#3b424c', cor2: '#272c33', rejunte: '#1e2228', rep: 2, acabamento: 'metalico' },
  { id: 'mov_granito_preto', camada: 'movel', nome: 'Granito Preto São Gabriel', padrao: 'granito', cor1: '#25292e', cor2: '#464d55', rejunte: '#1a1d21', rep: 3, acabamento: 'polido' },
  { id: 'mov_marmore_bancada', camada: 'movel', nome: 'Mármore Carrara (Bancada)', padrao: 'marmore', cor1: '#f4f3ef', cor2: '#bfc1c5', rejunte: '#dedcd6', rep: 2, acabamento: 'polido' },
];

/** Combos de reforma prontos para inspiração rápida por cômodo. */
export const SUGESTOES_REFORMA = [
  {
    id: 'escandinavo',
    nome: '🌿 Escandinavo Claro',
    desc: 'Piso vinílico freijó + paredes off-white (amplia e refresca o ambiente).',
    piso: 'piso_laminado_freijo',
    parede: 'par_offwhite',
    movelSugerido: 'mov_boucle_bege',
  },
  {
    id: 'tropical_rp',
    nome: '☀️ Tropical Fresco (Ribeirão Preto)',
    desc: 'Porcelanato polido claro (piso frio!) + parede verde sálvia suave.',
    piso: 'piso_porcelanato_claro',
    parede: 'par_verde_salvia',
    movelSugerido: 'mov_freijo',
  },
  {
    id: 'industrial',
    nome: '🏙️ Industrial Urbano',
    desc: 'Cimento queimado + parede tijolinho aparente + detalhes preto fosco.',
    piso: 'piso_cimento_queimado',
    parede: 'par_tijolinho',
    movelSugerido: 'mov_couro_caramelo',
  },
  {
    id: 'aconchego',
    nome: '🪵 Madeira & Ripado',
    desc: 'Piso carvalho + painel ripado freijó + móveis em linho cinza.',
    piso: 'piso_madeira_carvalho',
    parede: 'par_ripado_madeira',
    movelSugerido: 'mov_linho_cinza',
  },
  {
    id: 'cozinha_metro',
    nome: '🍳 Cozinha Metrô & Inox',
    desc: 'Porcelanato cinza urbano + azulejo metrô branco + inox/granito.',
    piso: 'piso_porcelanato_cinza',
    parede: 'par_azulejo_metro',
    movelSugerido: 'mov_inox',
  },
  {
    id: 'banheiro_spa',
    nome: '🚿 Banheiro Spa Mármore',
    desc: 'Mármore Calacatta no piso e parede + gabinete amadeirado.',
    piso: 'piso_marmore_calacatta',
    parede: 'par_marmore_claro',
    movelSugerido: 'mov_freijo',
  },
];

function normTxt(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function buscarTexturas(camada = 'piso', termo = '') {
  const q = normTxt(termo);
  return CATALOGO_TEXTURAS.filter((t) => {
    if (camada && t.camada !== camada) return false;
    if (!q) return true;
    return normTxt(`${t.nome} ${t.padrao} ${t.acabamento}`).includes(q);
  });
}

export function texturaPorId(id) {
  return CATALOGO_TEXTURAS.find((t) => t.id === id) || null;
}

/** Gera links prontos de pesquisa de texturas na internet (Poly Haven, AmbientCG, Google Imagens). */
export function linksPesquisaTextura(termo = '', camada = 'piso') {
  const base = termo.trim() || (camada === 'piso' ? 'porcelanato madeira' : camada === 'parede' ? 'revestimento parede' : 'tecido linho madeira');
  return {
    google: `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${base} textura seamless`)}`,
    polyhaven: `https://polyhaven.com/textures?q=${encodeURIComponent(base)}`,
    ambientcg: `https://ambientcg.com/list?q=${encodeURIComponent(base)}`,
    unsplash: `https://unsplash.com/s/photos/${encodeURIComponent(`${base} texture`)}`,
  };
}

/**
 * Gera um HTMLCanvasElement 256×256 com a textura procedural PBR (cor + padrão real).
 * Funciona 100% offline no navegador sem baixar imagens externas.
 */
export function desenharTexturaProcedural(spec, tamanho = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = tamanho;
  canvas.height = tamanho;
  const g = canvas.getContext('2d');
  const { padrao, cor1, cor2, rejunte } = spec;

  // Base
  g.fillStyle = cor1;
  g.fillRect(0, 0, tamanho, tamanho);

  // Ruído determinístico leve (sem flicker)
  let seed = 1337;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  if (padrao === 'azulejo') {
    const n = 2;
    const step = tamanho / n;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        g.fillStyle = (x + y) % 2 === 0 ? cor1 : cor2;
        g.fillRect(x * step + 2, y * step + 2, step - 4, step - 4);
      }
    }
    g.strokeStyle = rejunte || '#94a3b8';
    g.lineWidth = 4;
    for (let i = 0; i <= n; i++) {
      g.beginPath();
      g.moveTo(i * step, 0);
      g.lineTo(i * step, tamanho);
      g.stroke();
      g.beginPath();
      g.moveTo(0, i * step);
      g.lineTo(tamanho, i * step);
      g.stroke();
    }
  } else if (padrao === 'metro' || padrao === 'tijolo') {
    const linhas = padrao === 'metro' ? 6 : 8;
    const cols = padrao === 'metro' ? 3 : 4;
    const h = tamanho / linhas;
    const w = tamanho / cols;
    g.fillStyle = rejunte || '#cbd5e1';
    g.fillRect(0, 0, tamanho, tamanho);
    const gap = padrao === 'metro' ? 3 : 4;
    for (let r = 0; r < linhas; r++) {
      const off = r % 2 === 0 ? 0 : -w / 2;
      for (let c = -1; c <= cols; c++) {
        g.fillStyle = rand() > 0.45 ? cor1 : cor2;
        g.fillRect(c * w + off + gap / 2, r * h + gap / 2, w - gap, h - gap);
      }
    }
  } else if (padrao === 'madeira' || padrao === 'ripado') {
    const faixas = padrao === 'ripado' ? 12 : 5;
    const fw = tamanho / faixas;
    for (let i = 0; i < faixas; i++) {
      g.fillStyle = i % 2 === 0 ? cor1 : cor2;
      g.fillRect(i * fw, 0, fw, tamanho);
      // Veios sutis
      g.strokeStyle = rejunte || '#5c3a1e';
      g.globalAlpha = padrao === 'ripado' ? 0.55 : 0.18;
      g.lineWidth = padrao === 'ripado' ? 3 : 1.5;
      g.beginPath();
      g.moveTo(i * fw, 0);
      g.lineTo(i * fw, tamanho);
      g.stroke();
      if (padrao === 'madeira') {
        for (let v = 0; v < 4; v++) {
          const vx = i * fw + rand() * fw;
          g.beginPath();
          g.moveTo(vx, 0);
          g.bezierCurveTo(vx + 6, tamanho * 0.33, vx - 6, tamanho * 0.66, vx, tamanho);
          g.stroke();
        }
      }
      g.globalAlpha = 1;
    }
  } else if (padrao === 'taco') {
    const step = tamanho / 4;
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        g.fillStyle = (x + y) % 2 === 0 ? cor1 : cor2;
        g.fillRect(x * step, y * step, step, step);
        g.strokeStyle = rejunte;
        g.lineWidth = 2;
        g.strokeRect(x * step, y * step, step, step);
      }
    }
  } else if (padrao === 'marmore') {
    g.strokeStyle = cor2;
    for (let i = 0; i < 9; i++) {
      g.globalAlpha = 0.22 + rand() * 0.35;
      g.lineWidth = 1 + rand() * 3.5;
      g.beginPath();
      let y = rand() * tamanho;
      g.moveTo(0, y);
      for (let x = 32; x <= tamanho; x += 32) {
        y += (rand() - 0.5) * 34;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    g.globalAlpha = 1;
    g.strokeStyle = rejunte;
    g.lineWidth = 2;
    g.strokeRect(1, 1, tamanho - 2, tamanho - 2);
  } else if (padrao === 'cimento' || padrao === 'pintura' || padrao === 'granito') {
    const qtd = padrao === 'granito' ? 520 : padrao === 'cimento' ? 220 : 120;
    for (let i = 0; i < qtd; i++) {
      g.fillStyle = rand() > 0.5 ? cor2 : rejunte;
      g.globalAlpha = padrao === 'pintura' ? 0.08 : padrao === 'granito' ? 0.45 : 0.16;
      const r = padrao === 'granito' ? 1.5 + rand() * 3.5 : 8 + rand() * 28;
      g.beginPath();
      g.arc(rand() * tamanho, rand() * tamanho, r, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
  } else if (padrao === 'tecido') {
    g.strokeStyle = cor2;
    g.lineWidth = 2;
    g.globalAlpha = 0.35;
    for (let i = 0; i < tamanho; i += 6) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i, tamanho);
      g.stroke();
      g.beginPath();
      g.moveTo(0, i);
      g.lineTo(tamanho, i);
      g.stroke();
    }
    g.globalAlpha = 1;
  } else if (padrao === 'inox') {
    const grad = g.createLinearGradient(0, 0, tamanho, tamanho);
    grad.addColorStop(0, cor1);
    grad.addColorStop(0.5, cor2);
    grad.addColorStop(1, cor1);
    g.fillStyle = grad;
    g.fillRect(0, 0, tamanho, tamanho);
    g.strokeStyle = '#ffffff';
    g.globalAlpha = 0.14;
    for (let y = 0; y < tamanho; y += 3) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(tamanho, y);
      g.stroke();
    }
    g.globalAlpha = 1;
  } else if (padrao === 'ladrilho') {
    const half = tamanho / 2;
    for (let qy = 0; qy < 2; qy++) {
      for (let qx = 0; qx < 2; qx++) {
        const ox = qx * half;
        const oy = qy * half;
        g.fillStyle = cor1;
        g.fillRect(ox, oy, half, half);
        g.fillStyle = cor2;
        g.beginPath();
        g.moveTo(ox + half / 2, oy + 10);
        g.lineTo(ox + half - 10, oy + half / 2);
        g.lineTo(ox + half / 2, oy + half - 10);
        g.lineTo(ox + 10, oy + half / 2);
        g.closePath();
        g.fill();
        g.strokeStyle = rejunte;
        g.lineWidth = 3;
        g.strokeRect(ox, oy, half, half);
      }
    }
  }

  return canvas;
}

/**
 * Redimensiona e comprime uma foto enviada pelo usuário (câmera/galeria/internet)
 * para uma textura quadrada leve (512×512 JPEG) que cabe folgada no localStorage!
 */
export function comprimirFotoParaTextura(file, maxLado = 512) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = maxLado;
      c.height = maxLado;
      const g = c.getContext('2d');
      // Recorte central quadrado para encaixar sem distorção como ladrilho de textura
      const lado = Math.min(img.width, img.height);
      const sx = (img.width - lado) / 2;
      const sy = (img.height - lado) / 2;
      g.drawImage(img, sx, sy, lado, lado, 0, 0, maxLado, maxLado);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível ler a imagem selecionada.'));
    };
    img.src = url;
  });
}
