// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Your deployed URL. Used to build absolute links (canonical, social tags,
  // sitemap). Update before deploying.
  site: 'https://eshaben.github.io',
  // GitHub Pages serves a project repo (not a <username>.github.io repo) under
  // a path matching the repo name, so every route needs this prefix.
  base: '/portfolio',

  vite: {
    plugins: [tailwindcss()]
  }
});