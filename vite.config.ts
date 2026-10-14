import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Injects a Content-Security-Policy meta tag into the production build only
 * (the dev server relies on inline scripts for React Fast Refresh).
 * GitHub Pages cannot send custom headers, so a meta tag is the best option.
 */
function cspPlugin(supabaseUrl: string): Plugin {
  let supabaseOrigin = 'https://*.supabase.co';
  try {
    if (supabaseUrl) supabaseOrigin = new URL(supabaseUrl).origin;
  } catch {
    /* keep wildcard fallback */
  }
  const wsOrigin = supabaseOrigin.replace(/^http/, 'ws');
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
    `connect-src 'self' ${supabaseOrigin} ${wsOrigin}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  return {
    name: 'ftpd5-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`,
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Must match the GitHub repository name, e.g. https://USERNAME.github.io/FTPD5/
  const base = env.VITE_BASE_PATH || '/FTPD5/';

  return {
    base,
    plugins: [react(), tailwindcss(), cspPlugin(env.VITE_SUPABASE_URL ?? '')],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    build: {
      target: 'es2020',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            supabase: ['@supabase/supabase-js'],
            query: ['@tanstack/react-query'],
            forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
          },
        },
      },
    },
  };
});
