# EGD Consultoria

Site estatico institucional preparado para deploy no GitHub Pages.

## Publicacao

O repositorio inclui a workflow `.github/workflows/pages.yml`, que publica automaticamente as paginas HTML do root e a pasta `assets/`.

Para ativar no GitHub:

1. Suba o repositorio para o GitHub.
2. Em `Settings > Pages`, selecione `GitHub Actions` como source.
3. Faca push para a branch `main` ou `master`.

## Escopo do deploy

A publicacao envia:

- `index.html`
- `contato.html`
- `produtos.html`
- `servicos.html`
- `sobre.html`
- `assets/`

As pastas `export/` e `uploads/` nao entram no artifact do GitHub Pages.
