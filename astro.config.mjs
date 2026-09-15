// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Your deployed URL. Used to build absolute links (canonical, social tags,
  // sitemap). Update before deploying.
  site: 'https://eshaben.github.io/',
  base: '/portfolio',
  vite: {
    plugins: [tailwindcss()]
  }
});