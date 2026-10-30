import { defineConfig } from '@apps-in-toss/web-framework/config';
export default defineConfig({
  appName: 'mom-is-flower',
  brand: { primaryColor: '#315c46' },
  webView: {},
  permissions: [
    { name: 'camera', access: 'access' },
    { name: 'photos', access: 'read' },
  ],
  webBundleDir: 'dist',
});