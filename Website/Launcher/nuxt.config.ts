import { fileURLToPath } from 'node:url';
import website from '../Site/nuxt.config';
export default defineNuxtConfig({
  ...website,
  hooks: {
    'pages:extend'(pages) {
      const home = pages.find((p) => p.path === '/');
      if (home) home.file = fileURLToPath(new URL('./pages/index.vue', import.meta.url));
    },
  },
  srcDir: fileURLToPath(new URL('../Site/app', import.meta.url)),
  dir: { public: fileURLToPath(new URL('./public', import.meta.url)) },
  serverDir: fileURLToPath(new URL('./server', import.meta.url)),
  buildDir: fileURLToPath(new URL('./.nuxt', import.meta.url)),
  ssr: false,
  devtools: { enabled: false },
  telemetry: false,
  runtimeConfig: { public: { desktop: true, baseUrl: 'https://rankedworld.com' } },
  ignore: ['**/src-tauri/**'],
  nitro: {
    publicAssets: [
      ...(website.nitro?.publicAssets || []),
      { baseURL: '/licenses', dir: fileURLToPath(new URL('../Site/app/public/licenses', import.meta.url)) },
      { baseURL: '/models', dir: fileURLToPath(new URL('../Site/app/public/models', import.meta.url)) },
      { baseURL: '/cosmetics', dir: fileURLToPath(new URL('../Site/app/public/cosmetics', import.meta.url)) },
      { baseURL: '/video', dir: fileURLToPath(new URL('../Site/app/public/video', import.meta.url)) },
    ],
    preset: 'static',
    output: { publicDir: fileURLToPath(new URL('./dist', import.meta.url)) },
    prerender: { crawlLinks: false, routes: ['/'] },
  },
  vite: { server: { strictPort: true } },
});
