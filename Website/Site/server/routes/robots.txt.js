export default defineEventHandler(event => {
const cfg = useRuntimeConfig(event);
const origin = new URL(cfg.public.baseUrl).origin;
const lines = ['User-agent: *'];
for (const path of cfg.seoDisallow) lines.push('Disallow: ' + path);
lines.push('Disallow: /player/');
lines.push('Disallow: /api/');
lines.push('Disallow: /auth/');
lines.push('Allow: /');
lines.push('');
lines.push('Sitemap: ' + origin + '/sitemap.xml');
setResponseHeader(event, 'Content-Type', 'text/plain; charset=utf-8');
setResponseHeader(event, 'Cache-Control', 'public, max-age=3600');
return lines.join('\n') + '\n';
});
