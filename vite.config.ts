import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(process.cwd(), "popup.html"),
        options: resolve(process.cwd(), "options.html"),
        blocked: resolve(process.cwd(), "blocked.html"),
        background: resolve(process.cwd(), "src/background.ts"),
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === "background"
            ? "background.js"
            : "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
