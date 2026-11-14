const SPOTS = ['top', 'side', 'bottom'];
const shuffle = list => [...list].sort(() => Math.random() - 0.5);
const plan = count => ({
  deck: shuffle(Array.from({ length: count }, (_, i) => i)),
  spots: shuffle(SPOTS).slice(0, Math.random() < 0.3 ? 2 : 1),
  rail: Math.random() < 0.5 ? 'left' : 'right',
});
export function useAds(count = 4) {
  const ads = useState('ads', () => plan(count));
  const nuxt = useNuxtApp();
  if (import.meta.client && !nuxt._ads) {
    nuxt._ads = true;
    useRouter().afterEach((to, from) => { if (to.path !== from.path) ads.value = plan(count); });
  }
  return ads;
}
