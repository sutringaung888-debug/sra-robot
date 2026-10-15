import { defineConfig } from "vite";

// Relative base so the same build works at a domain root (Vercel) and under
// a project subpath (GitHub Pages: /<repo>/).
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    target: "es2020",
    chunkSizeWarningLimit: 800,
  },
});
