# Quando a planta real chegar (e as fotos e vídeos)

> Este documento é o roteiro para trocar a **planta estimada** pela **planta real** e para organizar as **fotos e vídeos** que você vai gravar. O app foi montado para não precisar de programador nessa hora.

---

## Parte 1 — Trocar a planta estimada pela real

Hoje o app abre com uma planta **estimada** da casa vagão (4,80 × 15,00 m). O modelo de verdade mora em **`app/data/casa.json`**. Você pode substituí-lo de três formas — escolha a que for mais confortável.

### Caminho A — Desenhar por cima da planta (recomendado)

1. Pegue a planta em **JPG ou PNG** (se vier em PDF, tire um print ou exporte como imagem, de preferência na maior resolução possível).
2. No app: **Interiores → Planta**.
3. Em **"Planta de fundo"**, envie a imagem.
4. **Calibre a escala** com uma medida conhecida da planta (ex.: uma parede de 3,00 m):
   - toque em **Calibrar com 2 pontos**;
   - clique nas duas pontas dessa parede;
   - digite a distância real (ex.: `3,00`).
5. Ajuste **opacidade**, **girar**, **largura** e **deslocar X/Z** até a planta encaixar no envelope.
6. Arraste os cômodos existentes e puxe o **canto verde** para casar com as paredes da planta. Use **＋ Adicionar cômodo** para o que faltar.
7. Em cada cômodo, confira portas e janelas e marque **"Medidas conferidas com trena"**.
8. Volte em **Dados** e veja o progresso e a ficha da casa.

Se quiser que a planta apareça **em todos os aparelhos**, salve-a como [`app/data/planta.png`](./app/data/planta.png) e publique. O app carrega essa imagem automaticamente como fundo (a imagem enviada pelo app tem prioridade).

> A imagem de fundo enviada pelo app fica guardada no **IndexedDB do aparelho** (não vai para o servidor). Se você trocar de celular, envie de novo — ou use `app/data/planta.png`.

### Caminho B — Editar o arquivo do modelo

`app/data/casa.json` é o arquivo oficial. Quem editar (você, o arquiteto ou um agente de IA) muda o app inteiro.

```json
{
  "versao": 1,
  "origem": "planta-real",
  "fonte": "Planta do arquiteto — dez/2026",
  "atualizadoEm": "2026-12-10T12:00:00.000Z",
  "envelope": {
    "x0": -1.45, "x1": 3.35,
    "z0": -6.5, "z1": 8.5,
    "altura": 2.9, "peDireito": 2.7,
    "espExterna": 0.18, "espInterna": 0.10
  },
  "rooms": [
    {
      "id": "sala",
      "nome": "Sala",
      "tipo": "sala",
      "x": -1.35, "z": 4.6, "w": 2.95, "d": 3.8,
      "cor": "#38bdf8",
      "piso": "porcelanato",
      "status": "medido",
      "notas": "trocar janela; ponto de ar-condicionado",
      "portas": [
        { "parede": "frente", "inicio": 0.35, "largura": 0.9, "altura": 2.1 }
      ],
      "janelas": [
        { "parede": "esquerda", "inicio": 0.9, "largura": 1.4, "altura": 1.2, "peitoril": 1.0 }
      ]
    }
  ]
}
```

**Como ler as coordenadas** (as mesmas do lote e do 3D):

- `x` cresce para a **direita** (quem olha a casa da rua).
- `z` cresce para a **frente** (rua). O fundo é `z` menor.
- `x`/`z` do cômodo são o **canto de menor valor**; `w` é a largura em `x` e `d` a profundidade em `z`.
- `parede`: `frente` (lado da rua), `fundo`, `esquerda` (lado do muro/janelas) ou `direita`.
- `inicio`: distância em metros do canto de menor valor da parede (frente/fundo: da esquerda; esquerda/direita: do fundo).
- `peitoril`: altura do chão até o vidro (janelas). Portas usam `peitoril: 0` implicitamente.

`tipo`: `sala`, `quarto`, `banheiro`, `cozinha`, `circulacao`, `servico` ou `outro`.
`piso`: `porcelanato`, `ceramica`, `madeira`, `cimento`, `vinilico` ou `nao_definido`.
`status`: `estimado` ou `medido`.

Depois de editar:

1. Rode `node --test --test-isolation=none test/*.test.mjs` (se quiser conferir que nada quebrou).
2. No app: **Dados → Carregar do projeto**. Isso substitui a planta local pela do arquivo.
3. Alternativa: abra o app em outro navegador/aparelho sem estado salvo — ele já carrega `casa.json` como planta inicial.

> **Atenção:** o navegador guarda uma cópia local. Se você editar o arquivo e não clicar em "Carregar do projeto", a cópia antiga continua aparecendo. O backup JSON (**Dados → Backup**) salva a planta + módulos + ajustes.

### Caminho C — Pedir para um agente de IA atualizar

Quando tiver a planta (PDF, foto ou DWG exportado) e as medidas, você pode pedir:

> "Atualize `app/data/casa.json` da Casa Maracaju 88 com a planta em anexo. Mantenha o schema, use `origem: 'planta-real'`, marque os cômodos como `medido` e rode os testes."

O arquivo e o schema acima são tudo o que o agente precisa. Se a planta estiver em PDF, peça também a conversão para imagem para usar o fundo no app.

---

## Parte 2 — Fotos e vídeos

### O que gravar

| Área | Fotos | Vídeo |
| :--- | :---: | :--- |
| Sala | 8 | 30–90 s andando devagar |
| Quarto 1 | 8 | 30–90 s |
| Banheiro | 8 | 30–60 s |
| Quarto 2 | 8 | 30–90 s |
| Cozinha / copa | 9 | 30–90 s |
| Corredor | 5 | 30 s de ponta a ponta |
| Muro de 15 m | 12 | 60 s caminhando de frente |
| Fundos / obra | 12 | 60–90 s girando 360° |
| Frente / fachada | 8 | 30–60 s |

- Sem zoom, celular na horizontal, uma foto a cada passo, **70% de sobreposição**.
- Luz difusa (manhã cedo, fim de tarde ou nublado).
- Ative o **GPS da câmera** antes de sair.

### Nome dos arquivos (importante)

O app **detecta a área pelo nome do arquivo**. Use o nome do cômodo no meio:

```
IMG_20261124_sala.jpg
quarto1_parede_norte.jpg
quarto 2 - janela.png
banheiro_box.jpg
cozinha_bancada.jpg
corredor_portas.jpg
muro_15m_parte2.jpg
fundos-obra.jpg
fachada_frente.jpg
```

Se o nome não tiver a área, o app usa a área selecionada no momento da importação. Você sempre pode corrigir depois.

### Importar no app

- **Captura → Enviar fotos da galeria** (aceita várias de uma vez; a área vem do nome).
- **Captura → Enviar vídeo do celular** (aceita vários).
- Ou use a câmera do app: **Captura → Fotografar** (escolha a área e dispare).
- Tudo fica no **IndexedDB** do aparelho.

### Exportar para virar 3D

1. **Captura → Exportar pacote 3D** gera um `.zip` com `fotos/<área>/`, `videos/`, `manifest.json` (medidas dos cômodos) e `LEIA-ME.txt`.
2. Rotas:
   - **Scaniverse** no celular → exportar `.glb` → **Casa 3D → Scan 3D**.
   - **Google Colab** com `tools/colab_3d_reconstruct.py` → `.ply` → **Casa 3D → Scan 3D**.
   - **Sweet Home 3D** para interiores com medidas exatas → `.obj`.
3. Ajuste escala/rotação/posição do scan usando a casa de **4,80 × 15,00 m** como referência.

### Arquivo morto no notebook (opcional)

Para guardar tudo organizado e mandar para o Colab, use esta estrutura em `capturas/`:

```
capturas/
  planta/        ← foto/print da planta real (para o fundo)
  sala/
  quarto1/
  banheiro/
  quarto2/
  cozinha/
  corredor/
  muro/
  fundos/
  frente/
  scans_3d/      ← .glb / .ply gerados
```

Nada disso é lido automaticamente pelo app publicado; é o seu arquivo de campo. Para o app, importe pela aba Captura (ou use o `.zip`).

---

## Checklist do dia em que a planta chegar

- [ ] Planta em JPG/PNG (ou PDF convertido).
- [ ] Interiores → Planta → enviar a imagem.
- [ ] Calibrar com 2 pontos usando uma cota conhecida.
- [ ] Ajustar cômodos e criar os que faltam.
- [ ] Conferir portas/janelas (largura, altura, peitoril).
- [ ] Marcar todos os cômodos como **medido**.
- [ ] Dados → conferir se a planta está fechada (sem sobreposição/vão).
- [ ] Dados → **Baixar planta (JSON)** e guardar junto da planta original.
- [ ] Dados → **Backup** (estado completo) antes de qualquer experimento.
- [ ] Comparar sol de 21/12 e 21/06 nos cômodos que mais esquentam.

## Checklist do dia das fotos/vídeos

- [ ] Nomes dos arquivos com a área.
- [ ] Importar tudo em **Captura**.
- [ ] Conferir a contagem por área (8/8, 12/12…).
- [ ] Exportar o pacote `.zip`.
- [ ] Rodar o Scaniverse ou o Colab.
- [ ] Importar o `.glb`/`.ply` em **Casa 3D → Scan 3D**.
- [ ] Ajustar escala (4,80 m de largura) e rotação Norte.

---

## Onde cada coisa fica

| O quê | Onde |
| :--- | :--- |
| Modelo da casa (planta real) | `app/data/casa.json` |
| Código do app | `app/js/*.js` |
| Imagem da planta de fundo | IndexedDB do aparelho (aba Interiores) |
| Fotos e vídeos capturados | IndexedDB do aparelho (aba Captura) |
| Medidas, módulos e ajustes | `localStorage` (chave `maracaju3d_estado_v3`) |
| Backup completo | **Dados → Backup** (JSON) |
| Pacote de fotos para 3D | **Captura → Exportar pacote 3D** (ZIP) |
| Arquivo de campo | `capturas/` (opcional, no notebook) |
| Testes | `node --test --test-isolation=none test/*.test.mjs` |

## Dúvidas comuns

**Mudei o casa.json e o app não mudou.** O navegador tem uma cópia local. Use **Dados → Carregar do projeto** ou limpe os dados do site.

**A imagem da planta não aparece.** Ela fica no aparelho em que foi enviada; o fundo não vai no backup JSON nem no ZIP.

**A planta está girada/invertida.** Use "Girar" (0/90/180/270) e "Deslocar X/Z". O app desenha a planta com a frente para baixo, igual à planta baixa.

**O scan 3D veio gigante.** Ajuste a escala no painel do Scan 3D; a casa tem 4,80 m de largura.
