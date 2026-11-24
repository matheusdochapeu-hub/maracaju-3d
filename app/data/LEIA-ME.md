# app/data — dados que você pode trocar sem mexer no código

## `casa.json` — o modelo da casa

É a planta que o app carrega. Estrutura:

- `versao` — deixe `1`.
- `origem` — `estimado`, `planta-real` ou `medido`.
- `fonte` — de onde vieram as medidas (ex.: "Planta do arquiteto, dez/2026").
- `envelope` — limites externos em metros e pé-direito.
- `rooms[]` — um objeto por cômodo:
  - `id`, `nome`, `tipo` (`sala`, `quarto`, `banheiro`, `cozinha`, `circulacao`, `servico`, `outro`)
  - `x`, `z`, `w`, `d` — canto de menor valor, largura (x) e profundidade (z)
  - `piso` (`porcelanato`, `ceramica`, `madeira`, `cimento`, `vinilico`, `nao_definido`)
  - `status` (`estimado` ou `medido`), `notas`
  - `portas[]` / `janelas[]` — `{ parede, inicio, largura, altura, peitoril }`
    - `parede`: `frente` (rua), `fundo`, `esquerda` (muro/janelas) ou `direita`
    - `inicio`: metros a partir do canto de menor valor da parede
- `atualizadoEm` — data ISO (opcional).

O referencial é o mesmo do 3D: **x** cresce para a direita (olhando da rua) e **z** para a frente (rua); o fundo tem z menor.

Depois de editar, no app: **Dados → Carregar do projeto**. Ou edite pelo próprio app e use **Dados → Baixar planta (JSON)**.

O passo a passo completo está em [`../../PLANO_REAL_E_MIDIA.md`](../../PLANO_REAL_E_MIDIA.md).

## `planta.png` — planta de fundo do projeto (opcional)

Se você salvar a planta real aqui como **`planta.png`** (ou `.jpg`, `.jpeg`, `.webp`), ela aparece automaticamente como fundo na aba **Interiores → Planta** em qualquer aparelho, mesmo sem enviar a imagem de novo.

- Use uma imagem nítida, de preferência exportada do PDF (não foto torta).
- A calibragem (escala, deslocamento, opacidade) é feita uma vez em cada aparelho.
- A imagem enviada pelo app fica no aparelho e tem prioridade sobre esta.
- Cuidado com o tamanho do arquivo: até ~2 MB é confortável no celular.
