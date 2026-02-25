import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://sebastiendegodez.github.io',
  base: '/copilot-instructions',
  integrations: [tailwind()],
  markdown: {
    shikiConfig: {
      theme: 'material-theme-palenight',
    },
  },
});
