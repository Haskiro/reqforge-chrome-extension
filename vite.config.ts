import { crx, defineManifest } from '@crxjs/vite-plugin';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';

const manifest = defineManifest({
  manifest_version: 3,
  name: 'ReqForge',
  version: '1.0.0',
  permissions: ['storage', 'tabs', 'windows', 'debugger'],
  host_permissions: ['<all_urls>'],
  background: { service_worker: 'src/background/service-worker.ts', type: 'module' },
  // No default_popup — we open a persistent window via chrome.action.onClicked
  action: {},
});

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  build: {
    rollupOptions: {
      // popup.html is no longer in the manifest, add it explicitly so CRXJS still bundles it
      input: { popup: resolve(__dirname, 'popup.html') },
    },
  },
});
