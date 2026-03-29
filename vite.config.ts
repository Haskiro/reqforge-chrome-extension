import { crx, defineManifest } from '@crxjs/vite-plugin';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';

const manifest = defineManifest({
  manifest_version: 3,
  name: 'ReqForge',
  version: '1.0.0',
  permissions: ['storage', 'tabs', 'windows', 'debugger', 'scripting'],
  host_permissions: ['<all_urls>'],
  background: { service_worker: 'src/background/service-worker.ts', type: 'module' },
  // No default_popup — we open a persistent window via chrome.action.onClicked
  action: {
    default_icon: {
      '16': 'src/icons/icon16.png',
      '32': 'src/icons/icon32.png',
      '48': 'src/icons/icon48.png',
      '128': 'src/icons/icon128.png',
    },
  },
  icons: {
    '16': 'src/icons/icon16.png',
    '32': 'src/icons/icon32.png',
    '48': 'src/icons/icon48.png',
    '128': 'src/icons/icon128.png',
  },
});

export default defineConfig({
  plugins: [svgr(), react(), crx({ manifest })],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/popup'),
      '@components': resolve(__dirname, 'src/popup/components'),
      '@pages': resolve(__dirname, 'src/popup/pages'),
      '@assets': resolve(__dirname, 'src/popup/assets'),
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
  build: {
    rolldownOptions: {
      // popup.html is no longer in the manifest, add it explicitly so CRXJS still bundles it
      input: { popup: resolve(__dirname, 'popup.html') },
    },
  },
});
