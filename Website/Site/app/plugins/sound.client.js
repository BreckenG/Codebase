import { sfx } from '~/lib/sound.js';

export default defineNuxtPlugin(() => {
  const CLICK = 'a, button, [role="button"], [role="menuitem"]';
  const HOVER = '.btn, .seg > button, .seg > a, .rig, .pick, .tile, .lb__pick, .nav__plan';
  let last = 0;
  let lastEl = null;
  document.addEventListener('pointerover', (e) => {
    const el = e.target.closest?.(HOVER);
    if (!el || el.contains(e.relatedTarget)) return;
    const now = performance.now();
    if (now - last < 140 || (el === lastEl && now - last < 1500)) return;
    last = now;
    lastEl = el;
    sfx.hover();
  });
  document.addEventListener('pointerdown', (e) => {
    const el = e.target.closest?.(CLICK);
    if (!el) return;
    if (el.matches('.btn--brand')) return sfx.confirm();
    if (el.hasAttribute('aria-pressed')) return sfx.toggle(el.getAttribute('aria-pressed') !== 'true');
    sfx.press();
  });
});
