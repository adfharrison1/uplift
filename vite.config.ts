import { defineConfig } from 'vite';
import {
  createLocalBridgeAccessPolicy,
  localDiskBridgePlugin,
} from './src/interfaces/vite/localDiskBridgePlugin.js';

export default defineConfig(() => {
  const policy = createLocalBridgeAccessPolicy();
  return {
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      cors: policy.cors,
    },
    plugins: [localDiskBridgePlugin({}, policy)],
  };
});
