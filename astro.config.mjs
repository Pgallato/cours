// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';
import tailwindcss from '@tailwindcss/vite';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeTableaux from './src/lib/rehype-tableaux.mjs';

export default defineConfig({
  site: 'https://cours.example.com',
  trailingSlash: 'always',
  build: { format: 'directory' },
  markdown: {
    // Formules : $…$ et $$…$$ rendues en HTML statique par KaTeX au build ;
    // tableaux : étiquettes de colonne pour l'affichage en cartes sur mobile
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [[rehypeKatex, { strict: false, output: 'htmlAndMathml' }], rehypeTableaux],
    }),
  },
  integrations: [mdx()],
  vite: { plugins: [tailwindcss()] },
});
