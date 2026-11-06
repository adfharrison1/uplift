import { defineConfig } from 'vite';
import { localDiskBridgePlugin } from './src/interfaces/vite/localDiskBridgePlugin.js';

export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  plugins: [localDiskBridgePlugin()],
});
