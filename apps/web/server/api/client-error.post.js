let windowStart = 0;
let count = 0;
export default defineEventHandler(async (event) => {
  const now = Date.now();
  if (now - windowStart > 60000) {
    windowStart = now;
    count = 0;
  }
  if (++count > 60) return { ok: false };
  let data = {};
  try {
    data = JSON.parse((await readRawBody(event)) || '{}');
  } catch {
    return { ok: false };
  }
  const clean = (value, max) => String(value || '').replace(/[^\x20-\x7e]/g, '').slice(0, max);
  const agent = clean(getHeader(event, 'user-agent'), 160);
  console.error(`client error ${clean(data.path, 80)} ${clean(data.where, 8)}: ${clean(data.message, 300)} :: ${clean(data.stack, 600)} :: ${agent}`);
  return { ok: true };
});
