import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  server: { port: 5174, open: true },
  /* Resolve the workspace packages from source so editing the library hot-reloads the demo. */
  resolve: {
    alias: {
      "@email-builder/core": new URL("../../packages/core/src/index.ts", import.meta.url).pathname,
      "@email-builder/engine": new URL("../../packages/engine/src/index.ts", import.meta.url).pathname,
      "@email-builder/vue": new URL("../../packages/vue/src/index.ts", import.meta.url).pathname,
      "@email-builder/styles": new URL("../../packages/styles/dist/email-builder.css", import.meta.url).pathname,
    },
  },
});
