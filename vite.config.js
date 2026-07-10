import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vercel: api/ oppdages automatisk som serverless-funksjoner (bygges ikke av Vite).
export default defineConfig({
  plugins: [react()],
});
