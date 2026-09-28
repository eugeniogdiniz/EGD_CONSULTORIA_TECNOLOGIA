# Prompts das imagens EGD — direção final azul

Ferramenta: imagegen integrada, sem fallback CLI/API. Imagens conceituais. A direção final incorpora as referências do cliente: azul tecnológico, azul profundo, branco e monograma EG.

Originais PNG selecionados e WebP finais em `public/brand/images/`. A exploração inicial em laranja está arquivada em `docs/brand/exploracao-inicial/` e não integra o kit final.

## Território — revisão final

Saída: `territorio-original.png` / `territorio-azul.webp`.
Entrada: imagem conceitual da primeira exploração.

```text
Edit this exact website hero image. Keep every structure, perspective, architectural model composition, objects, materials, shadows, and crop unchanged. Rebrand only its palette for EGD Consultoria em Tecnologia using the user's blue technology identity: replace all orange ribbon/pathway surfaces with rich electric azure blue #0875E1, replace dark green/teal structures and water tones with deep navy #071D3B, shift warm ivory surfaces and background to a very subtle cool porcelain white #F3F6FB. Preserve sophisticated realistic physical materials and soft natural light, no neon glow, no new objects, no letters or logos. The blue pathway must remain very clear and contrast with the cool white model. Output final 1536x1024 landscape image.
```

## Fluxo — revisão final

Saída: `fluxo-original.png` / `fluxo-azul.webp`.
Entrada: imagem conceitual do fluxo da primeira exploração.

```text
Edit this exact EGD workflow image, changing only its palette to match a blue technology consultancy brand. Preserve composition, camera, geometry, three platforms, ribbon path, upright data slats, all shapes and materials exactly. Replace the orange ribbon by vivid azure blue #0875E1 with realistic matte sheen; recolor dark green slats to deep navy #071D3B; recolor sage translucent panels to very subtle pale blue glass; shift warm ivory background and platforms to cool porcelain white #F3F6FB. Keep photographic architectural model realism and soft natural light. No glowing effects, letters, logos or extra objects. Final landscape 1536x1024.
```

## Logo

Reconstruída em vetores a partir das referências do cliente, sem geração bitmap. Geometria em `src/content/brand.json`; exportação SVG por `scripts/build-brand-logo.mjs`; PNGs derivados dos vetores.
