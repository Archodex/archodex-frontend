import fs from 'fs/promises';
import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react-swc';
import * as path from 'path';
import svgr from 'vite-plugin-svgr';
import tailwindcss from '@tailwindcss/vite';

// React Flow has some default theming that lives in base.css. Because these
// defaults are set in CSS, we can't override them via Tailwind without
// resorting to !important.
//
// Instead, this plugin loads the base.css file and strips out all such default
// styles (i.e. those where the value is var(--some-variable)).
const stripReactFlowBaseStyles: () => Plugin = () => ({
  name: 'strip-react-flow-base-styles',
  load: {
    filter: { id: /@xyflow\/react\/dist\/base.css/ },
    async handler(id: string) {
      let css = (await fs.readFile(id)).toString();

      css = css.replaceAll(/\s*[a-zA-Z-]+: var\([^;]+\);/g, '');

      return css;
    },
  },
});

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    target: 'ES2022',
    rollupOptions: {
      input: { app: 'index.html', authServiceWorker: 'auth-service-worker.ts' },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === 'authServiceWorker' ? 'auth-service-worker.js' : 'assets/[name]-[hash].js',
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('elkjs/lib/elk.bundled')) return 'elkjs';
            if (id.includes('lucide')) return 'lucide';
            if (id.includes('tailwind')) return 'tailwind';
            if (id.includes('xyflow')) return 'xyflow';
            if (id.includes('zod')) return 'zod';

            return 'vendor';
          }
        },
      },
    },
  },
  plugins: [svgr(), react(), tailwindcss(), stripReactFlowBaseStyles()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
});
