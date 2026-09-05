import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
