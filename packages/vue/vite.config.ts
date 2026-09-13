/* ═══ Build ═══
 *
 * Library mode, ES + CommonJS — matching core, engine and react, so a `require()`-based toolchain
 * (Jest, older SSR setups) can load it. No UMD: a package whose peer is Vue gains nothing from it. Declarations come from
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
      formats: ["es", "cjs"],
      fileName: (format) => (format === "es" ? "index.js" : "index.cjs"),
    },
    rollupOptions: {
      /* Vue is a peer, and core/engine are shared with whatever else the host renders — two
         copies of the registry in one page would mean two block catalogues. */
      external: ["vue", "@email-builder/core", "@email-builder/engine"],
      output: { exports: "named" },
    },
  },
});
