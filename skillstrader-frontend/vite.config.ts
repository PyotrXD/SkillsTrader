import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function parsePort(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    return fallback;
  }

  return parsed;
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      host: env.VITE_DEV_HOST || '0.0.0.0',
      port: parsePort(env.VITE_DEV_PORT, 5173),
      strictPort: true,
    },
    preview: {
      host: env.VITE_PREVIEW_HOST || '0.0.0.0',
      port: parsePort(env.VITE_PREVIEW_PORT, 4173),
      strictPort: true,
    },
  };
});
