const SPOTS = ['top', 'side', 'bottom'];
const shuffle = n => Array.from({ length: n }, (_, i) => i).sort(() => Math.random() - 0.5);
const pick = () => SPOTS[Math.floor(Math.random() * SPOTS.length)];
export function useAds(count = 4) {
  const deck = useState('ad-deck', () => shuffle(count));
  const spot = useState('ad-spot', pick);
  const nuxt = useNuxtApp();
  if (import.meta.client && !nuxt._ads) {
    nuxt._ads = true;
    useRouter().afterEach((to, from) => {
      if (to.path === from.path) return;
      deck.value = shuffle(count);
      spot.value = pick();
    });
  }
  return { deck, spot };
}
