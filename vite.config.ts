import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // Tauri watches Rust sources; Vite must not watch locked compiler outputs.
      ignored: ["**/src-tauri/**", "**/work/**"]
    }
  },
  envPrefix: ["VITE_", "TAURI_"]
});
