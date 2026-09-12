import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, open: true },
  /* Resolve the workspace packages from source so editing the library hot-reloads the demo. */
  resolve: {
    alias: {
      "@email-builder/core": new URL("../../packages/core/src/index.ts", import.meta.url).pathname,
      "@email-builder/engine": new URL("../../packages/engine/src/index.ts", import.meta.url).pathname,
      "@email-builder/react": new URL("../../packages/react/src/index.ts", import.meta.url).pathname,
      "@email-builder/styles": new URL("../../packages/styles/dist/email-builder.css", import.meta.url).pathname,
    },
  },
});
