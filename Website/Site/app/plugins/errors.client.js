const CHUNK = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|Loading (CSS )?chunk \S+ failed/i;
export default defineNuxtPlugin((nuxtApp) => {
  let sent = 0;
  const seen = new Set();
  const send = (error, where) => {
    const message = String(error?.message || error).slice(0, 300);
    const stale = CHUNK.test(message);
    if (sent < 5 && !seen.has(message)) {
      sent++;
      seen.add(message);
      const stack = String(error?.stack || '').split('\n').slice(0, 4).join(' | ');
      const body = JSON.stringify({ message, stack: stack.slice(0, 600), path: location.pathname, where: stale ? 'chunk' : where });
      try {
        navigator.sendBeacon('/api/client-error', body);
      } catch {}
    }
    if (stale) reloadNuxtApp({ ttl: 600000 });
  };
  nuxtApp.hook('vue:error', (error) => send(error, 'vue'));
  nuxtApp.hook('app:error', (error) => send(error, 'app'));
  window.addEventListener('error', (event) => {
    if (event.error) send(event.error, 'window');
  });
  window.addEventListener('unhandledrejection', (event) => send(event.reason, 'promise'));
});
