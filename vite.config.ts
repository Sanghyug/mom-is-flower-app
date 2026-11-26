import { defineConfig, loadEnv } from 'vite';
import { adSenseConfig } from './src/lib/ads';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const ads = adSenseConfig(loadEnv(mode, process.cwd(), 'VITE_'));
  return {
  plugins: [react(), {
    name: 'adsense-publisher-files',
    transformIndexHtml() { return ads.publisherValid ? [{ tag: 'meta', attrs: { name: 'google-adsense-account', content: ads.client }, injectTo: 'head' as const }] : []; },
    generateBundle() { if (ads.publisherValid) this.emitFile({ type: 'asset', fileName: 'ads.txt', source: `google.com, ${ads.client.replace('ca-pub-', 'pub-')}, DIRECT, f08c47fec0942fa0\n` }); },
  }, VitePWA({
    registerType: 'autoUpdate',
    workbox: { navigateFallbackDenylist: [/^\/toss$/, /^\/s\//, /^\/invite\//, /^\/api\//, /\.[^/]+$/] },
    manifest: {
      name: '엄마는꽃', short_name: '엄마는꽃', description: '산책길에 만난 꽃의 이름과 이야기를 찾고 나만의 식물도감에 담아요.',
      theme_color: '#315c46', background_color: '#faf9f5', display: 'standalone', start_url: '/',
      icons: [{ src: '/app_icon_192.png', sizes: '192x192', type: 'image/png' }, { src: '/app_icon.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }],
    },
  })],
};
});
