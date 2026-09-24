const DISCORD = "https://discord.gg/b4nxZCbdR4";

export function useSiteSeo() {
const route = useRoute();
const cfg = useRuntimeConfig();
let origin = "";
try { origin = new URL(cfg.public.baseUrl).origin; } catch { origin = ""; }
const routes = cfg.public.seoRoutes || [];
const trimmed = computed(() => { const p = route.path; return p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p; });

const match = computed(() => routes.find(r => r.toLowerCase() === trimmed.value.toLowerCase()) || "");
const canonical = computed(() => origin + (match.value || trimmed.value));
const jsonld = computed(() => match.value !== "/" ? null : JSON.stringify([
{ "@context": "https://schema.org", "@type": "Organization", name: "Ranked World", url: origin + "/", logo: origin + "/img/logo.png", sameAs: [DISCORD] },
{ "@context": "https://schema.org", "@type": "WebSite", name: "Ranked World", url: origin + "/" }
]));
useHead(() => ({
link: origin ? [{ rel: "canonical", href: canonical.value }] : [],
meta: [...(origin ? [{ property: "og:url", content: canonical.value }] : []), ...(match.value ? [] : [{ name: "robots", content: "noindex, nofollow" }])],
script: jsonld.value ? [{ type: "application/ld+json", innerHTML: jsonld.value }] : []
}));
}
