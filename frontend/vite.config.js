import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    // While developing (npm run dev), /api calls go to the backend
    proxy: { '/api': 'http://localhost:5000' },
  },
});
