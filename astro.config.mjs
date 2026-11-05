// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';
import tailwindcss from '@tailwindcss/vite';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default defineConfig({
  site: 'https://cours.example.com',
  trailingSlash: 'always',
  build: { format: 'directory' },
  markdown: {
    // Formules : $…$ et $$…$$ rendues en HTML statique par KaTeX au build
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [[rehypeKatex, { strict: false, output: 'htmlAndMathml' }]],
    }),
  },
  integrations: [mdx()],
  vite: { plugins: [tailwindcss()] },
});
