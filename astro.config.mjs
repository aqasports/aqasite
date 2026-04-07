// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  build: {
    format: 'file',   // outputs /tarifs.html not /tarifs/index.html
  },
  compressHTML: false, // keep output readable for debugging
});
