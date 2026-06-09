import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: "autoUpdate",

      manifest: {
        name: "엄마는꽃",
        short_name: "엄마는꽃",
        description:
          "AI가 길가의 꽃 이름을 찾아주고, 나만의 꽃도감으로 저장해주는 앱",
        theme_color: "#ec4899",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",

        icons: [
          {
            src: "/app_icon_192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/app_icon.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
});
