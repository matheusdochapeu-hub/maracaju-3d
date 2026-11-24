# Guia de Campo: Captura, Georreferenciamento e Reconstrução 3D (Celular + Notebook)

> **Projeto 05 — Casa Maracaju 88 (Ribeirão Preto - SP)**  
> Este guia explica **como fotografar e escanear** o muro de 15 m, o quintal dos fundos, a frente e o interior da casa para obter modelos 3D com **escala métrica real** e **alinhamento ao Norte Verdadeiro**.

---

## 1. Preparação Antes de Fotografar (Regra de Ouro em Ribeirão Preto)

1. **Ative o GPS na câmera do celular:**
   - Android (Google Câmera / Samsung): *Configurações → Salvar localização = ATIVADO*.
   - iPhone: *Ajustes → Privacidade → Serviços de Localização → Câmera = Durante o uso (Localização Precisa = ATIVADO)*.
2. **Melhor horário para fotografar/escanear:**
   - **Evite o sol forte do meio-dia** (gera sombras pretas duras que "queimam" a textura do muro e confundem os algoritmos de fotogrametria).
   - **Ideal:** início da manhã (**6h30–7h45**), final da tarde (**17h00–17h45**) ou **dia nublado** (luz difusa uniforme = reconstrução 3D muito mais limpa!).
3. **Referência de Escala Real (Obrigatório para medir depois):**
   - Cole **1 folha A4 branca** (`21,0 × 29,7 cm`) com fita crepe no meio do muro OU encoste uma **trena aberta exatamente em 1,00 m** (ou cabo de vassoura de medida conhecida) no chão/parede.
   - Assim, ao importar o `.glb` no **Maracaju 3D**, você ajusta a escala com precisão de centímetros!
4. **Orientação ao Norte Verdadeiro:**
   - Abra um app de bússola no celular (ex.: *Physics Toolbox Sensor Suite* ou bússola nativa) encostado paralelamente ao **muro esquerdo (15 m)** e anote o azimute em graus (valor estimado pelo satélite: **`~40° NE`** no sentido Frente → Fundo).

---

## 2. Protocolos de Captura por Ambiente

### A) Muro Esquerdo de 15 m (Para o Estúdio do Muro + 3D)
- **Para prévia rápida 2D (Estúdio do Muro):**
  - Divida o muro mentalmente em **3 trechos de 5 metros** (Setor A — Frente/Sul, Setor B — Centro, Setor C — Fundo/Norte).
  - Afaste-se o máximo possível na largura do corredor, segure o celular **reto (sem inclinar para cima/baixo)** na altura do peito (~1,35 m) e tire 1 foto nítida de cada trecho (total: 3 a 5 fotos limpas).
- **Para reconstrução 3D contínua do muro:**
  - Caminhe lateralmente (passo de caranguejo) de frente para o muro, dando **1 passo (~50 cm) por foto** (sobreposição de **70–80%** entre fotos vizinhas).
  - Faça **2 passadas**: uma olhando reto (90° para o muro) e outra com ângulo leve de 30° pegando a junção muro + piso. Total: ~35–45 fotos.

### B) Área dos Fundos (16 m² — Futura Cobertura, Churrasco, Oficina, Emergência 72h, Galinheiro & Peixes)
- Tire fotos em **círculo olhando para fora** (360° no centro do espaço, 1 foto a cada 20–30°) + **fotos dos 4 cantos olhando para o centro**.
- Inclua o **beiral/telhado atual da casa** e a altura dos **muros de divisa** — isso é essencial para simular corretamente o caimento da nova cobertura e a entrada de sol matinal!

### C) Interiores (Para Planejar Reformas com a Scarlet)
- **Dica para cômodos internos:** superfícies brancas lisas confundem fotogrametria pura.
  - **Opção mais rápida e precisa (Recomendada para interiores):** use **MagicPlan** ou **Polycam (Modo Room/Planta)** no celular para gerar a planta cotada em 5 minutos, ou meça os cômodos com trena e desenhe no **Sweet Home 3D** (gratuito, open-source, levíssimo no notebook) exportando como `.obj` para o **Maracaju 3D**.
  - **Opção visual rápida:** use o **Scaniverse** (modo *Splat* ou *Mesh*) caminhando devagar com luzes acesas + cortinas abertas.

---

## 3. Comparativo das 4 Rotas de Reconstrução 3D (Sem Exigir GPU NVIDIA Local)

### Rota 1 — Mais Rápida (Zero PC, 100% no Celular): **Scaniverse**
- **Como funciona:** App gratuito (Android e iOS) que processa **3D Gaussian Splatting** e **Malha 3D (`.glb`/`.obj`)** localmente no processador do celular.
- **Passos:**
  1. Instale **Scaniverse** → escolha **Mesh** (se quiser sombras reais no Maracaju 3D) ou **Splat** (se quiser fotorrealismo).
  2. Escaneie a área dos fundos ou um trecho do muro.
  3. Exporte em **`.glb`** (glTF Binary) → envie para o notebook na pasta `capturas/scans_3d/` → carregue no **Maracaju 3D**!

### Rota 2 — Open-Source IA de Ponta no GitHub (GPU Gratuita do Google Colab): **VGGT / MASt3R**
- **Repositórios GitHub:**
  - [`facebookresearch/vggt`](https://github.com/facebookresearch/vggt) — gera cena 3D + posições de câmera a partir de fotos comuns em segundos.
  - [`naver/mast3r`](https://github.com/naver/mast3r) — reconstrução métrica densa muito robusta mesmo com poucas fotos.
- **Como rodar:**
  1. Jogue 15 a 40 fotos do muro/quintal em `capturas/muro/` e compacte em `.zip`.
  2. Siga o script pronto em [`tools/colab_3d_reconstruct.py`](./tools/colab_3d_reconstruct.py) no **Google Colab** (Runtime → T4 GPU gratuita).
  3. Baixe o arquivo `maracaju_scan.glb` gerado e importe direto no **Maracaju 3D**.

### Rota 3 — Fotogrametria Georreferenciada por GPS (100% Local em CPU): **WebODM**
- **Repositório GitHub:** [`OpenDroneMap/WebODM`](https://github.com/OpenDroneMap/WebODM)
- **Vantagem:** lê automaticamente o **GPS EXIF** das fotos do celular e entrega ortofoto + malha `.obj`/`.glb` georreferenciada sem exigir placa NVIDIA (usa CPU via Docker).
- **Ideal para:** mapear todo o quintal aberto ou, futuramente, cruzar fotos aéreas/telhado com o lote.

### Rota 4 — Planta Arquitetônica Precisa + Interiores (Levíssimo na Intel HD 530): **Sweet Home 3D + BlenderGIS**
- **Sweet Home 3D** (Open Source): você e a Scarlet montam paredes, portas, janelas, móveis, bancada da oficina e churrasqueira com medidas exatas em cm → *Visualização 3D → Exportar para formato OBJ* → importa no **Maracaju 3D** para testar o sol real entrando pelas janelas!
- **[`domlysz/BlenderGIS`](https://github.com/domlysz/BlenderGIS)**: caso queira baixar no Blender o mapa de satélite + relevo SRTM da Vila Tibério (Ribeirão Preto) em volta da Rua Maracaju, 88.

---

## 4. Fluxo de Georreferenciamento das Fotos (Script Local)

Sempre que trouxer novas fotos do celular para o notebook:

```powershell
# 1. Copie as fotos para capturas/muro/ (ou qualquer subpasta de capturas/)
# 2. Rode o extrator EXIF GPS + Bússola:
python tools/exif_geo_mapper.py

# 3. Abra o Maracaju 3D para visualizar os pinos das fotos e usar o Estúdio do Muro:
python run_maracaju_3d.py
```

O script `exif_geo_mapper.py` calcula automaticamente a posição relativa $(X, Z)$ em metros de cada foto a partir do ponto de origem da **Casa Maracaju 88 (`-21,1742° S, -47,8339° W`)**, converte para o sistema de coordenadas alinhado ao lote (`~40° NE`) e grava `capturas/geo_manifest.json`.
