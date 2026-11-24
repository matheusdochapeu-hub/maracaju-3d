# 05 — Scanner 3D & Gêmeo Digital Geolocalizado (Casa Maracaju 88)

> **Status:** Aplicativo 3D interativo + pipeline open-source (GitHub) + Estúdio de Prévias do Muro prontos para uso  
> **Local de referência:** Rua Maracaju, 88 — Vila Tibério, Ribeirão Preto - SP (`-21,1742° S, -47,8339° W` | Eixo `~40° SO → NE`)  
> **Compatibilidade:** Celular (Android/iOS) + Notebook (inclusive com GPU integrada Intel HD 530 — sem exigir placa NVIDIA)

---

## 1. Objetivo do Projeto

Criar o **Gêmeo Digital 3D Geolocalizado** da **Casa Maracaju 88** para:
1. **Escanear a casa, muros, quintal e interiores** usando o celular ou notebook e cruzar os modelos com a **geolocalização real (`-21,1742° S, -47,8339° W`)** e a **trajetória real do sol em Ribeirão Preto** (365 dias × 24h).
2. **Gerar prévias visuais antes de furar paredes, construir ou comprar equipamentos** — integrando:
   - **Projeto 01 (`01-estacao-meteorologica-windy`)** + **Projeto 02 (`02-rede-mesh`)**: mastro no telhado, orientação Norte do painel solar 30W e linha de visada LoRa 915 MHz.
   - **Projeto 03 (`03-irrigacao-inteligente`)**: horta/flores no muro esquerdo de 15 m (Setores A/B/C) + pergolado de uvas e treliça de cabaça no canteiro frontal 3×2 m.
   - **Projeto 04 (`04-galinheiro-biofabrica`)**: galinheiro elevado + piquete + torre de tenébrios (na sombra fresca!) + tanque de algas/Azolla.
   - **Novos módulos do ecossistema integrado:** **Tanque de Peixes / Aquaponia**, **Composteira 3 Baias**, e a **Área Coberta dos Fundos (16 m²+)** dividida em **Área de Churrasco + Oficina/Bancada de Ferramentas + Estação de Emergência 72h**.
3. **Planejamento em conjunto com a Scarlet (Interiores & Reformas):** modo **Raio-X / Planta Baixa** no 3D para avaliar luz natural, calor nos cômodos e testar ideias internas antes da obra, além do **Estúdio do Muro** para simular visualmente plantas e estruturas diretamente **sobre as fotos reais tiradas no celular**.

---

## 2. Arquivos e Ferramentas Incluídos Neste Projeto

| Arquivo / Pasta | Função |
| :--- | :--- |
| [`PLANO_MESTRE_ECOSSISTEMA.md`](./PLANO_MESTRE_ECOSSISTEMA.md) | Plano diretor "Infraestrutura Primeiro, Biologia Depois" integrando cobertura dos fundos, oficina de ferramentas, plano de emergência 72h, peixes, galinhas, composteira, horta, clima e interiores. |
| [`GUIA_CAPTURA_E_RECONSTRUCAO_3D.md`](./GUIA_CAPTURA_E_RECONSTRUCAO_3D.md) | Passo a passo para fotografar/escanear a casa e o muro no celular, calibrar escala e Norte Verdadeiro, e gerar arquivos `.glb`/`.ply` com projetos open-source do GitHub. |
| [`run_maracaju_3d.py`](./run_maracaju_3d.py) | Servidor web local (Python puro, zero dependências extras). Abre o simulador no notebook **e** libera acesso pelo celular na mesma rede Wi-Fi! |
| [`app/`](./app/index.html) | Aplicativo Web **Maracaju 3D**: Simulador Solar 3D (`Three.js` + `SunCalc`), importador de scans `.glb/.obj/.ply`, catálogo arrastável dos projetos e **Estúdio do Muro (Prévia sobre Foto Real com leitura EXIF GPS)**. |
| [`tools/exif_geo_mapper.py`](./tools/exif_geo_mapper.py) | Script Python que lê pastas de fotos do celular em `capturas/`, extrai GPS/Bússola EXIF e posiciona cada foto no mapa georreferenciado da Casa Maracaju 88. |
| [`tools/colab_3d_reconstruct.py`](./tools/colab_3d_reconstruct.py) | Receita pronta para rodar **VGGT / MASt3R** na GPU gratuita do Google Colab (resolve a falta de GPU NVIDIA no notebook) e baixar o `.glb` da casa em minutos. |
| `capturas/muro/` e `capturas/scans_3d/` | Pastas prontas para guardar as fotos que você tirar em casa e os modelos 3D gerados. |

---

## 3. Projetos Open-Source do GitHub Selecionados (Arquitetura em 4 Etapas)

Após analisar o hardware local (**Intel HD Graphics 530** — sem GPU NVIDIA CUDA), a pilha open-source foi escolhida para funcionar **sem travamentos** entre **celular + notebook + GPU gratuita na nuvem (Colab)** quando necessário:

| Etapa | Projeto / Repositório GitHub | Licença / Custo | Papel no Ecossistema Maracaju 88 |
| :--- | :--- | :---: | :--- |
| **1. Captura Mobile + GPS** | [**Open3Dmap**](https://github.com/x4dqn/Open3Dmap) + apps de captura rápida (**Scaniverse** / **KIRI Engine** / câmera nativa c/ GPS) | Open Source / Gratuito | Captura fotos com EXIF GPS + bússola ou gera malha `.glb` / Gaussian Splat direto no celular (Scaniverse roda 100% no aparelho, grátis). |
| **2. Reconstrução 3D por IA (Fotos → `.glb`)** | [**VGGT (`facebookresearch/vggt`)**](https://github.com/facebookresearch/vggt) e [**MASt3R (`naver/mast3r`)**](https://github.com/naver/mast3r) | Open Source (MIT / CC) | Estado da arte em visão 3D: converte 10 a 60 fotos comuns de celular em modelo 3D `.glb` em segundos rodando no **Google Colab gratuito (GPU T4)**. |
| **2B. Gaussian Splatting (WebGPU)** | [**Brush (`ArthurBrussee/brush`)**](https://github.com/ArthurBrussee/brush) + [**GaussianSplats3D (`mkkellogg/GaussianSplats3D`)**](https://github.com/mkkellogg/GaussianSplats3D) | Open Source (Apache/MIT) | Treina e renderiza reconstruções fotorrealistas (`.ply`/`.splat`) usando WebGPU/Three.js sem exigir CUDA. |
| **2C. Fotogrametria Georreferenciada (CPU)** | [**WebODM (`OpenDroneMap/WebODM`)**](https://github.com/OpenDroneMap/WebODM) + [**COLMAP (`colmap/colmap`)**](https://github.com/colmap/colmap) | Open Source (AGPL/BSD) | Lê GPS EXIF das fotos e gera ortofoto + modelo 3D métrico georreferenciado rodando em CPU (Docker). |
| **3. Planta Interna & GIS** | **Sweet Home 3D** + [**BlenderGIS (`domlysz/BlenderGIS`)**](https://github.com/domlysz/BlenderGIS) | Open Source (GPL) | Levíssimos no notebook: ideais para desenhar o interior da casa com a Scarlet e exportar `.obj`/`.glb` direto para o **Maracaju 3D**. |
| **4. Cruzamento Solar & Simulador Local** | [**SunCalc (`mourner/suncalc`)**](https://github.com/mourner/suncalc) + **Three.js** *(já embutidos no nosso app `app/`)* | Open Source (MIT/BSD) | Calcula azimute e altura solar reais de `-21,1742° S, -47,8339° W` e projeta sombras em tempo real sobre o lote e seus scans 3D. |

> [!NOTE]
> **Por que NÃO usar Meshroom (AliceVision) localmente neste notebook?**  
> A etapa *DepthMap* do Meshroom exige GPU **NVIDIA com CUDA**. Como o notebook usa **Intel HD Graphics 530**, a melhor rota sem gastar R$ 1 é: **Scaniverse no celular** (para escaneamentos rápidos em `.glb`) ou **VGGT / MASt3R no Google Colab gratuito** (para transformar um conjunto de fotos do muro/quintal em `.glb` com alta fidelidade).

---

## 4. Como Rodar o Aplicativo "Maracaju 3D" Agora (Notebook e Celular)

### No Notebook (Windows PowerShell)
```powershell
cd "c:\Users\matheus.ribeiro\Desktop\Matheus\5. IA\4. Outros Projetos e Hardware\projetos-hardware\05-gemeo-digital-scanner-3d"
python run_maracaju_3d.py
```
O terminal exibirá automaticamente dois endereços:
- **No notebook:** `http://127.0.0.1:8088`
- **No celular (mesmo Wi-Fi):** `http://<IP-DO-SEU-NOTEBOOK>:8088` *(você pode caminhar no quintal com o celular na mão olhando as sombras e os módulos!)*

### Como Usar as 3 Abas do App
1. **🌍 Gêmeo Digital 3D & Sol Real:**
   - Escolha a data (**Verão 21/Dez**, **Equinócio 21/Mar**, **Inverno 21/Jun** ou **Hoje**) e arraste o horário (ou clique em **▶ Animar Sol**) para ver exatamente onde o sol bate no muro de 15 m, no canteiro 3×2 m, na área dos fundos, no tanque de peixes e nas janelas da casa.
   - Ligue/desligue ou clique em qualquer módulo (Estação Meteorológica, Antena Mesh, Horta 15m, Galinheiro, Tanque de Peixes, Composteira, Churrasco, Oficina de Ferramentas, Estação Emergência 72h) para **mover no terreno (X, Z, Rotação)** e comparar cenários!
   - Clique em **📦 Importar Scan 3D (`.glb`/`.obj`/`.ply`)** para carregar o modelo escaneado real da sua casa/muro sobre o terreno georreferenciado.
   - Use **🏠 Modo Raio-X (Interiores)** para conversar com a Scarlet sobre reformas internas e insolação nos cômodos.
2. **🧱 Estúdio do Muro (Prévia sobre Foto Real):**
   - Carregue a foto do muro (ou qualquer parede/cômodo) que você bater em casa.
   - O sistema lê automaticamente o **EXIF GPS e a Bússola** da foto (quando ativados na câmera).
   - Arraste e redimensione prévias de **Floreiras, Vasos, Treliça, Linha de Gotejamento (Setores A/B/C), Bancada, Tanque ou Prateleiras** direto em cima da foto real e exporte em **PNG** para validar antes de comprar ou furar a parede!
3. **🛰️ Mapa de Capturas & Pipeline GitHub:**
   - Exibe todas as fotos mapeadas em `capturas/` pelo script `tools/exif_geo_mapper.py`, mostra a cobertura espacial e fornece o roteiro de 1 clique para gerar o 3D no Colab.

---

## 5. Próximos Passos Práticos em Casa (Checklist Rápido)
- [ ] Ativar **"Salvar localização (GPS)"** no app da câmera do celular antes de bater as fotos.
- [ ] Bater fotos do **muro esquerdo (15 m)** em sequência (com 1 trena aberta ou folha A4 colada no muro para referência de escala) e salvar em `capturas/muro/`.
- [ ] Rodar `python tools/exif_geo_mapper.py` para georreferenciar todas as fotos automaticamente.
- [ ] Abrir o **Estúdio do Muro** no app e testar as prévias das plantas e dos setores de irrigação com a Scarlet.
- [ ] Fazer um scan 3D rápido do quintal dos fundos (16 m²) com **Scaniverse** (exportar `.glb`) ou enviar 25–40 fotos pelo roteiro **VGGT/MASt3R** e importar no **Maracaju 3D** antes de fechar o desenho da cobertura dos fundos.
