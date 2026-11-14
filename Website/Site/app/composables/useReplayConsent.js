export function useReplayConsent() {
  const state = useState('replay-consent', () => ({ loaded: false, accepted: false, version: '2026-09-12', acceptedAt: null, error: '', busy: false }));
  const { me } = useMe();
  async function load() {
    if (!me.value.user) { state.value = { ...state.value, loaded: true, accepted: false, acceptedAt: null, error: '' }; return; }
    state.value.busy = true;
    state.value.error = '';
    state.value.loaded = false;
    state.value.accepted = false;
    try { const result = await apiFetch('/api/me/replay-consent'); state.value = { ...state.value, ...result, loaded: true, busy: false, error: '' }; }
    catch (error) { state.value.accepted = false; state.value.loaded = true; state.value.error = error?.data?.statusMessage || 'Could not load your recording permission. Try again.'; }
    finally { state.value.busy = false; }
  }
  async function save(accepted) {
    if (state.value.busy) return;
    state.value.busy = true;
    state.value.error = '';
    try { const result = await apiFetch('/api/me/replay-consent', { method: 'POST', body: { accepted, version: state.value.version } }); state.value = { ...state.value, ...result, loaded: true, error: '' }; }
    catch (error) { state.value.error = error?.data?.statusMessage || 'Could not save your recording permission. Try again.'; }
    finally { state.value.busy = false; }
  }
  return { consent: state, loadConsent: load, saveConsent: save };
}
