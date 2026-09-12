/* ═══ Build ═══
 *
 * Library mode, ES only: the consumer is always a bundler, and a UMD build of a package whose
 * peer is Vue buys nothing but a second artefact to keep in step. Declarations come from
 * `vue-tsc` afterwards, because Rollup cannot type-check an SFC. */

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  build: {
    target: "es2020",
    sourcemap: true,
    emptyOutDir: true,
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: () => "index.js",
    },
    rollupOptions: {
      /* Vue is a peer, and core/engine are shared with whatever else the host renders — two
         copies of the registry in one page would mean two block catalogues. */
      external: ["vue", "@email-builder/core", "@email-builder/engine"],
      output: { exports: "named" },
    },
  },
});
