import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';
import { fileURLToPath } from "url";

// ESM equivalent of __filename and __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },

  // 👇 ADD THIS PART
  server: {
    host: true,  // allows external access
    allowedHosts: [
      "*.ngrok-free.dev", // allow all ngrok URLs
      "superbly-unlotted-sharda.ngrok-free.dev" // your specific domain
    ],
  }
});
