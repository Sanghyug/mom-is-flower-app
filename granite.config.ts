import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "mom-is-flower",
  brand: {
    displayName: "엄마는꽃",
    primaryColor: "#315c46",
    icon: "https://static.toss.im/appsintoss/44649/ce049019-148f-4a94-ae91-e03689863323.png",
  },
  web: {
    host: "localhost",
    port: 5173,
    commands: {
      dev: "vite --host 0.0.0.0",
      build: "tsc -b && vite build --mode toss",
    },
  },
  permissions: [
    {
      name: "camera",
      access: "access",
    },
    {
      name: "photos",
      access: "read",
    },
  ],
  outdir: "dist",
  webViewProps: {
    type: "partner",
  },
});
