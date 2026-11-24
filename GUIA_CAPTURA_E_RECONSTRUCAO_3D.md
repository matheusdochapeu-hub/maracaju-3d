# Guia de campo — medir, fotografar e virar modelo 3D

> Para a Casa Maracaju 88 (Ribeirão Preto/SP). Feito para ser aberto no celular enquanto você caminha pela casa.
> Tempo total estimado: **1 h** para medir tudo + **40 min** para fotografar.

---

## 1. Antes de começar (5 min)

- [ ] Trena de 3 m (ou 5 m) e uma folha A4 para referência de escala.
- [ ] Celular carregado (a câmera e o GPS gastam bateria).
- [ ] **GPS da câmera ligado** (Android: *Câmera → Configurações → Salvar localização*; iPhone: *Ajustes → Privacidade → Serviços de Localização → Câmera*).
- [ ] Luz: prefira **começo da manhã** ou **fim da tarde**, ou dia nublado. Sol duro do meio-dia estoura a foto e atrapalha a reconstrução.
- [ ] No app: abra **Dados → Backup** e guarde o JSON antes de começar (se algo der errado, você volta).

---

## 2. Medir os cômodos (a parte que destrava tudo)

Para cada cômodo, meça **de parede a parede, sem o rodapé**:

| O que medir | Onde anotar no app | Por que importa |
| :--- | :--- | :--- |
| Largura (m) | Interiores → cômodo → Largura | Área e planta baixa |
| Profundidade (m) | Interiores → cômodo → Profundidade | Área e planta baixa |
| Pé-direito (m) | Dados → Envelope → Pé-direito | Volumes, ar-condicionado, prateleiras |
| Portas: largura × altura | Interiores → Portas e janelas | Circulação e reforma |
| Janelas: largura × altura × peitoril | Interiores → Portas e janelas | **É o que calcula o sol que entra** |
| Piso (porcelanato, madeira…) | Interiores → Piso | Orçamento de reforma |

**Atalho:** meça um cômodo inteiro e marque **"Medidas conferidas com trena"**. O percentual da casa sobe na hora.

> A planta de partida é uma **estimativa** (casa vagão de ~4,8 × 15 m com corredor lateral). O objetivo é substituir cada número estimado pelo número da trena.

---

## 3. Fotografar cada área

Regra de ouro: **uma foto a cada passo, sem zoom, com 70% de sobreposição**. Segure o celular na altura do peito, na horizontal, e gire o corpo — não a câmera.

| Área | Fotos | Como fazer |
| :--- | :---: | :--- |
| Sala | 8 | De um canto: 4 paredes + chão + teto. Inclua portas e janelas inteiras. |
| Quarto 1 | 8 | Mesma sequência. Abra o guarda-roupa. Registre tomadas e interruptores. |
| Banheiro | 8 | Luz acesa. Parede do chuveiro, pia, ralo e registros. |
| Quarto 2 | 8 | Mesma sequência do quarto 1. |
| Cozinha | 9 | Bancada, fogão, geladeira, janela, porta dos fundos, ponto de água/gás. |
| Corredor | 5 | De uma ponta a outra, incluindo as portas. |
| Muro de 15 m | 12 | Caminhe de frente para o muro, 1 passo por foto. Depois uma passada a 30° pegando muro + chão. |
| Fundos / obra | 12 | Gire 360° no centro + 4 cantos olhando para o centro. Inclua o beiral e a altura dos muros. |
| Frente | 8 | Fachada em dois ângulos, portão, canteiro 3 × 2 m e calçada. |

**Escala:** encoste a trena aberta em 1,00 m em uma parede da primeira foto de cada área. Serve para calibrar depois no Estúdio de prévia.

**Vídeo (opcional, mas ajuda muito):** 30–90 s andando devagar pelo cômodo, celular na horizontal, sem girar rápido. Grave um vídeo por cômodo se for usar o VGGT/Colab.

---

## 4. Exportar e transformar em 3D

1. No app: **Captura → Exportar pacote 3D**. Sai um `.zip` com:
   - `fotos/<área>/*.jpg` — fotos já comprimidas;
   - `videos/*.webm` — se você gravou;
   - `manifest.json` — medidas dos cômodos, GPS e notas;
   - `LEIA-ME.txt` — instruções.
2. Escolha uma rota:

### Rota A — Scaniverse (mais rápida, no celular)
1. Instale o **Scaniverse** (Android/iOS), escolha **Mesh**.
2. Escaneie o quintal, o muro ou um cômodo caminhando devagar.
3. Exporte **`.glb`** e envie para o notebook.
4. No app: **Casa 3D → Scan 3D** → importe → ajuste escala, rotação e posição.

### Rota B — VGGT no Colab (fotos → malha, GPU grátis)
1. Suba o `.zip` no script `tools/colab_3d_reconstruct.py` (Runtime → T4 GPU).
2. Baixe o `.ply` gerado.
3. Importe em **Casa 3D → Scan 3D**.

### Rota C — Sweet Home 3D (interiores com medidas exatas)
1. Desenhe a planta com as medidas da seção 2.
2. Exporte **`.obj`** e importe no app.

---

## 5. Escala e Norte

- **Norte verdadeiro:** o app usa o azimute do lote (padrão **40°**). Se você medir com bússola encostada no muro esquerdo, ajuste em **Casa 3D → Giro do lote**.
- **Escala do scan:** depois de importar, use a trena como referência. Se o modelo veio 10× maior, corrija no slider de escala; a casa tem **4,8 m de largura** e **15 m de comprimento** — use isso para conferir.
- **GPS:** o botão **Usar meu GPS agora** no quintal deixa a simulação solar exata para o seu ponto. A lat/long padrão é a da casa.

---

## 6. Problemas comuns

| Sintoma | Causa | Solução |
| :--- | :--- | :--- |
| "A câmera do navegador não abriu" | Página em `http://` ou permissão negada | Use o link `https://` (GitHub Pages) ou o botão de câmera nativa. |
| Foto do iPhone não importa | HEIC não é lido pelo navegador | Tire a foto pelo botão do app (salva JPEG) ou converta para JPEG. |
| Modelo 3D "deitado" ou gigante | Scan exportado em outra escala | Ajuste escala/rotação no painel do Scan 3D. |
| Sol do cômodo dá 0 h | Janelas ainda são estimativas ou o sol não entra naquele ponto | Confira as janelas (largura, peitoril) e teste outro horário. |
| App lento no celular | Muitas fotos em alta resolução | As fotos já são comprimidas; limpe capturas antigas em **Captura → Limpar**. |
| Perdi os dados | Navegador limpou o armazenamento | Restaure o backup JSON em **Dados → Restaurar**. |

---

## 7. Depois de capturar

- [ ] Marcar os cômodos medidos como **medido**.
- [ ] Conferir a planta (sem sobreposição, sem buraco) em **Dados → Ficha**.
- [ ] Baixar a **Ficha em Markdown** e mandar para a Scarlet/arquiteto.
- [ ] Comparar o sol de **21/12** e **21/06** nos cômodos que mais esquentam.
- [ ] Fechar o desenho da cobertura dos fundos com a simulação de sombra.
