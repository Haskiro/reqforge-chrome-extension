import { crx, defineManifest } from '@crxjs/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const manifest = defineManifest({
  manifest_version: 3,
  name: 'ReqForge',
  version: '1.0.0',
  permissions: ['declarativeNetRequest', 'webRequest', 'storage', 'tabs'],
  host_permissions: ['<all_urls>'],
  background: { service_worker: 'src/background/service-worker.ts', type: 'module' },
  action: { default_popup: 'popup.html' },
});

export default defineConfig({
  plugins: [react(), crx({ manifest })],
});
