import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { defineConfig } from 'vite';
import { comlink } from 'vite-plugin-comlink';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths(), comlink()],
  worker: {
    plugins: () => [comlink()],
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'app'),
    },
  },
});
