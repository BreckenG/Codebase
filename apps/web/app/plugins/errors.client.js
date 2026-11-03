export default defineNuxtPlugin((nuxtApp) => {
  let sent = 0;
  const send = (error, where) => {
    if (sent++ >= 5) return;
    const stack = String(error?.stack || '').split('\n').slice(0, 4).join(' | ');
    const body = JSON.stringify({ message: String(error?.message || error).slice(0, 300), stack: stack.slice(0, 600), path: location.pathname, where });
    try {
      navigator.sendBeacon('/api/client-error', body);
    } catch {}
  };
  nuxtApp.hook('vue:error', (error) => send(error, 'vue'));
  nuxtApp.hook('app:error', (error) => send(error, 'app'));
});
