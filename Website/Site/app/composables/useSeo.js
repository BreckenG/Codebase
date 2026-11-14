const SITE = "Ranked World";
const CARD = "/img/og-card.png";

export function useSeo(input) {
  const cfg = useRuntimeConfig();
  let origin = "";
  try { origin = new URL(cfg.public.baseUrl).origin; } catch { origin = ""; }
  return useHead(() => {
    const o = (typeof input === "function" ? input() : input) || {};
    const title = o.title ? (o.brandTitle ? o.title : o.title + " | " + SITE) : SITE;
    const meta = [{ property: "og:title", content: title }, { property: "og:image", content: origin + (o.image || CARD) }, { name: "twitter:title", content: title }];
    if (o.description) meta.push({ name: "description", content: o.description }, { property: "og:description", content: o.description }, { name: "twitter:description", content: o.description });
    return { title, meta };
  });
}
