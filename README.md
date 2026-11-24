# 05 — Maracaju 3D · Gêmeo digital da Casa 88

> **O que é:** um app web (sem build, sem servidor) para **medir, fotografar e simular** a Casa Maracaju 88 antes de reformar.
> **Onde:** Rua Maracaju, 88 — Vila Tibério, Ribeirão Preto/SP · `-21,1742° S, -47,8339° W` · eixo do lote `~40°`
> **Status:** app v4 — **planta real 1:100 carregada** (10 cômodos, 95 m² úteis), interiores navegáveis, captura guiada com o celular e sol real. Testado no notebook e pensado para o celular em casa.

---

## O que dá para fazer

| Pergunta | Onde responder |
| :--- | :--- |
| Como é a casa por dentro? | **Interiores** → 3D com corte, planta baixa cotada e passeio em primeira pessoa. |
| Este cômodo é quente? Entra sol? | **Interiores** → "Sol no cômodo" calcula horas de sol direto e de tarde com as janelas reais. |
| E a área externa? | **Casa 3D** → módulos do quintal, muro de 15 m, cobertura dos fundos e sol de verão/inverno. |
| Como eu levanto a casa de verdade? | **Captura** → fotos e vídeos guiados por área, com pacote `.zip` pronto para virar 3D. |
| O que ainda falta medir? | **Dados** → progresso, ficha da casa em Markdown e lista de pendências. |

## A planta real já está no app

O modelo não é mais um chute: vem da **prancha 1:100** da casa (terreno 159,50 m², área a construir 88 m²). A casa tem **5,00 × 19,00 m internos**, **10 cômodos** (dois banheiros, alpendre, poço de ventilação e corredor lateral) e 95 m² úteis.

- O modelo vive em [`app/data/casa.json`](./app/data/casa.json) e é editável.
- A prancha tratada está em [`app/data/planta.png`](./app/data/planta.png) e aparece como **fundo da planta 2D** em qualquer aparelho.
- O que foi modelado, as cotas e o que ainda precisa de conferência estão em [`PLANTA_MARACAJU_88.md`](./PLANTA_MARACAJU_88.md).

Para atualizar quando medir no local:

1. **Editar no app** — Interiores → Planta: arraste/redimensione e ajuste portas e janelas; marque como medido.
2. **Editar o arquivo** — mude `app/data/casa.json` e clique em **Dados → Carregar do projeto**.
3. **Pedir para um agente** — o schema e o passo a passo estão em [`PLANO_REAL_E_MIDIA.md`](./PLANO_REAL_E_MIDIA.md).

As fotos e vídeos também já têm fluxo: importação em lote com **detecção da área pelo nome do arquivo**, gravação de vídeo pelo app e pacote `.zip` para Scaniverse/Colab.

## As 4 abas

1. **🏠 Casa 3D** — o lote inteiro: muros, casa, cobertura dos fundos, 11 módulos do ecossistema e o sol real de Ribeirão Preto. Clique num módulo para ver quantas horas de sol ele pega e mover no terreno.
2. **🛋️ Interiores** — a casa montada a partir de um **modelo de cômodos editável**: paredes, portas, janelas, pisos e móveis de referência. Três modos: **3D** (corte com o telhado escondido), **Planta** (arraste e redimensione os cômodos) e **Passeio** (ande por dentro).
3. **📷 Captura** — câmera do celular dentro do app, gravação de vídeo, galeria local e **exportação de pacote 3D** com fotos organizadas por área + manifesto de medidas.
4. **📋 Dados** — percentual do levantamento, ficha da casa, envelope (largura/comprimento/pé-direito), pendências e backup.

## Como rodar

**No celular ou em qualquer lugar (jeito mais simples):**
abra o link publicado — <https://matheusdochapeu-hub.github.io/maracaju-3d/app/>.

**No notebook, sem instalar nada:**
```powershell
cd "c:\Users\matheus.ribeiro\Desktop\Matheus\5. IA\4. Outros Projetos e Hardware\projetos-hardware\05-gemeo-digital-scanner-3d"
python -m http.server 8088 --directory app
# abra http://127.0.0.1:8088
```
> A câmera do navegador exige `https://` ou `localhost`. No GitHub Pages funciona; em `http://192.168.x.x` funciona o resto, mas a câmera cai no modo "câmera nativa do celular".

**Como app na rede Wi-Fi (celular no quintal):**
```powershell
python run_maracaju_3d.py
```
O terminal mostra o endereço do notebook e o do celular na mesma rede.

## O modelo da casa (o coração do projeto)

A planta não está chumbada no código: o modelo real vive em `app/data/casa.json` (carregado no boot) e é editável no app. A validação e a geometria ficam em `app/js/casa-modelo.js`.

```js
{
  envelope: { x0, x1, z0, z1, altura, peDireito, espExterna, espInterna },
  rooms: [{
    id, nome, tipo, x, z, w, d,            // retângulo no referencial do lote
    piso, status: 'estimado' | 'medido',
    portas:  [{ parede, inicio, largura, altura }],
    janelas: [{ parede, inicio, largura, altura, peitoril }],
    notas
  }]
}
```

- O **3D**, a **planta 2D** e a **ficha** são três leituras do mesmo objeto: mexeu na planta, o 3D e as contas mudam juntos.
- As paredes são geradas automaticamente: paredes compartilhadas viram uma só, portas e janelas viram vãos reais (com peitoril e verga).
- A planta carregada é a da **prancha 1:100**: 5,00 × 19,00 m internos, 10 cômodos. Cada cômodo tem um status; quando você mede com trena, marca como **medido** e o cálculo de sol fica mais confiável.
- O sol do cômodo é calculado por **raycasting** contra as paredes, janelas e telhado — não é chute.

## Captura → modelo 3D

1. Abra **Captura**, escolha a área e toque em **Fotografar**. A câmera traseira abre com guia de enquadramento.
2. Faça ~8 fotos por cômodo (uma a cada passo, 70% de sobreposição) e, se quiser, grave um **vídeo de caminhada** de 30–90 s.
3. Toque em **Exportar pacote 3D**. O `.zip` traz `fotos/<área>/...`, `videos/...`, `manifest.json` (medidas dos cômodos) e `LEIA-ME.txt`.
4. Transforme em modelo:
   - **Scaniverse** (grátis, processa no celular) → exportar `.glb` → importar em **Casa 3D**.
   - **Colab + VGGT/MASt3R** → use `tools/colab_3d_reconstruct.py` (GPU T4 gratuita). O notebook local não tem CUDA.
   - **Sweet Home 3D** para interiores com medidas exatas → exportar `.obj`.
5. Importe o arquivo em **Casa 3D → Scan 3D** e ajuste escala/rotação/posição.

Passo a passo detalhado de campo: [`GUIA_CAPTURA_E_RECONSTRUCAO_3D.md`](./GUIA_CAPTURA_E_RECONSTRUCAO_3D.md).

## Onde ficam os dados

- Medidas, módulos e ajustes: `localStorage` do navegador (chave `maracaju3d_estado_v4`).
- Fotos e vídeos: `IndexedDB` do aparelho (nada é enviado para servidor).
- Backup para trocar de aparelho: **Dados → Backup** (JSON). Fotos saem no pacote `.zip` da Captura.

> Cenários da versão anterior (`maracaju3d_state_v1`) são migrados automaticamente. O estado v3 (planta estimada) é ignorado a partir desta versão: a casa abre com a planta real; as fotos continuam no IndexedDB.

## Testes

```powershell
node --test --test-isolation=none test/*.test.mjs
```
Cobrem o modelo da casa (paredes, vãos, completude, colisão), a escala da planta de fundo, a detecção de área pelo nome do arquivo, o gerador de ZIP e o leitor de EXIF/GPS. Não dependem de navegador.

## Arquivos

| Arquivo | Papel |
| :--- | :--- |
| `app/index.html` | Estrutura das 4 abas, modais de câmera/foto/ajuda e estúdio de prévia. |
| `app/css/style.css` | Tema escuro, layout de 3 colunas no desktop e navegação inferior no celular. |
| `app/js/main.js` | Estado, abas, sol, terreno, módulos, scan e backup. |
| `app/js/mundo.js` | Cena Three.js: lote, módulos, telhado, satélite e sol. |
| `app/data/casa.json` | **Modelo real da casa** (envelope, 10 cômodos, portas e janelas). |
| `app/data/planta.png` | Prancha tratada (linhas claras, fundo transparente) usada como fundo na planta. |
| `app/js/casa-modelo.js` | Modelo puro da casa: cômodos, paredes, vãos, áreas, completude, colisão. |
| `app/js/casa-3d.js` | Constrói a casa em Three.js a partir do modelo (inclui móveis de referência). |
| `app/js/interiores.js` | Lista/editor de cômodos, planta 2D editável, fundo da prancha e passeio. |
| `app/js/planta.js` | Escala e calibragem da planta de fundo. |
| `app/js/captura.js` | Câmera, MediaRecorder, galeria IndexedDB e pacote ZIP. |
| `app/js/levantamento.js` | Progresso, ficha, pendências, envelope e backups. |
| `app/js/zip.js` | Gerador de `.zip` sem biblioteca externa. |
| `app/js/exif.js` | GPS/bússola/data do EXIF. |
| `app/js/suncalc.js` | Motor solar (NOAA). |
| `app/js/wall-planner.js` | Estúdio de prévia sobre foto real (muro, plantas, móveis). |
| `tools/exif_geo_mapper.py` | Opcional: varre `capturas/`, extrai GPS e gera manifesto geográfico. |
| `tools/colab_3d_reconstruct.py` | Receita pronta de VGGT no Colab. |
| `run_maracaju_3d.py` | Servidor local para abrir no celular pela mesma rede Wi-Fi. |
| [`PLANTA_MARACAJU_88.md`](./PLANTA_MARACAJU_88.md) | O que foi lido da prancha, medidas, premissas e pendências de conferência. |

## Próximos passos em casa

- [ ] Conferir na trena as medidas da prancha (5,00 × 19,00 m) e o pé-direito.
- [ ] Confirmar os dois banheiros, o poço de ventilação e o alpendre de 5,00 m.
- [ ] Conferir portas e janelas (largura, altura, peitoril) — posições inferidas do scan.
- [ ] Medir o lote real (frente de 5,50 m?) e decidir se o cenário externo muda.
- [ ] Fotografar cada cômodo (8 fotos) e os fundos (12 fotos).
- [ ] Exportar o pacote e gerar o `.glb` no Scaniverse ou no Colab.
- [ ] Comparar sol de verão × inverno antes de fechar a cobertura dos fundos.
