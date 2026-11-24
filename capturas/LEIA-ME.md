# capturas/ — arquivo de campo (opcional)

Esta pasta **não é lida automaticamente** pelo app publicado. Ela serve para
guardar as fotos e vídeos originais no notebook, mandar para o Colab e manter
o histórico do levantamento.

## Estrutura sugerida

```
capturas/
  planta/       foto ou print da planta real (também serve de fundo no app)
  sala/
  quarto1/
  banheiro/
  quarto2/
  cozinha/
  corredor/
  muro/
  fundos/
  frente/
  scans_3d/     .glb / .ply / .obj gerados no Scaniverse ou no Colab
```

Use o nome da área no nome do arquivo (`IMG_001_sala.jpg`, `quarto1_norte.jpg`,
`muro_15m_parte2.jpg`). O app detecta a área pelo nome quando você importa em
**Captura → Enviar fotos da galeria**.

## O que vai no Git

- Fotos leves e a planta: podem ir para o repositório (ficam públicas no
  GitHub Pages). Evite rostos, documentos e qualquer coisa sensível.
- Vídeos grandes e scans pesados: prefira manter fora do Git (ou use Git LFS).
- O app guarda as capturas no **IndexedDB do aparelho**; esta pasta é o
  arquivo morto, não a fonte do app.

Roteiro completo: [`../PLANO_REAL_E_MIDIA.md`](../PLANO_REAL_E_MIDIA.md).
