import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  plugins: [react(), VitePWA({
    disable: mode === 'toss', registerType: 'autoUpdate',
    workbox: { navigateFallbackDenylist: [/^\/api\//, /\.[^/]+$/] },
    manifest: {
      name: '엄마는꽃', short_name: '엄마는꽃', description: '산책길에 만난 꽃의 이름과 이야기를 찾고 나만의 식물도감에 담아요.',
      theme_color: '#315c46', background_color: '#faf9f5', display: 'standalone', start_url: '/',
      icons: [{ src: '/app_icon_192.png', sizes: '192x192', type: 'image/png' }, { src: '/app_icon.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }],
    },
  })],
}));
