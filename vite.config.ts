import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  clearScreen: false,

  plugins: [react()],

  server: {
    host: "127.0.0.1",
    port: 5174,
    strictPort: true,

    watch: {
      ignored: [
        "**/src-tauri/**",
      ],
    },
  },

  envPrefix: [
    "VITE_",
    "TAURI_ENV_*",
  ],

  build: {
    target: "esnext",
    minify: false,
    sourcemap: false,
  },
});