export default defineEventHandler(event => {
const cfg = useRuntimeConfig(event);
const origin = new URL(cfg.public.baseUrl).origin;
const lastmod = cfg.seoLastmod || {};
const urls = cfg.public.seoRoutes.map(path => {
const loc = origin + (path === '/' ? '/' : path);
const when = lastmod[path];
return '<url><loc>' + loc + '</loc>' + (when ? '<lastmod>' + when + '</lastmod>' : '') + '</url>';
});
setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8');
setResponseHeader(event, 'Cache-Control', 'public, max-age=3600');
return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.join('\n') + '\n</urlset>\n';
});
