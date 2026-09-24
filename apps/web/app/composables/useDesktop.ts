import { invoke, isTauri } from '@tauri-apps/api/core';
type JoinState = { requestId: string; code: string; state: string; message: string; updatedAt: number; };
type DesktopStatus = { gamePath: string | null; gameInstalled: boolean; bepInExInstalled: boolean; helperInstalled: boolean; gameRunning: boolean; signedIn: boolean; captureRecording: boolean; join: JoinState | null; version: string; };
type SignInInfo = { userCode: string; verificationUri: string; expiresIn: number; interval: number; };
type LauncherUpdate = { available: boolean; version: string | null; };
type UpdateProgress = { phase: 'downloading' | 'installing'; downloaded: number; total: number | null; };
export function useDesktop() { const nuxt = useNuxtApp(); const { load: loadMe } = useMe(); const generation = useState("desktop-login-generation", () => 0); const enabled = Boolean(useRuntimeConfig().public.desktop); const available = import.meta.client && isTauri(); const status = useState<DesktopStatus | null>('desktop-status', () => null); const failure = useState('desktop-failure', () => ''); const busy = useState('desktop-busy', () => false); const login = useState<SignInInfo | null>('desktop-login', () => null); const loginPending = useState('desktop-login-pending', () => false); const pendingJoin = computed(() => ['waiting', 'joining'].includes(status.value?.join?.state || '')); async function refresh() { if (!available) return; status.value = await invoke<DesktopStatus>('desktop_status'); } async function action(command: string, args: Record<string, unknown> = {}) { if (!available) { failure.value = 'Open the installed Ranked World launcher to use game controls.'; return false; } if (busy.value) return false; busy.value = true; failure.value = ''; try { await invoke(command, args); await refresh(); return true; } catch (error) { failure.value = String(error); return false; } finally { busy.value = false; } }
const update = useState<LauncherUpdate>('desktop-update', () => ({ available: false, version: null }));
const progress = useState<UpdateProgress | null>('desktop-update-progress', () => null);
const prompt = useState<'helper' | 'update' | null>('desktop-prompt', () => null);
const requestedCode = useState<string | null>('desktop-requested-code', () => null);
const updateRequired = useState('desktop-update-required', () => false);
const promptError = useState('desktop-prompt-error', () => '');
async function checkUpdate() { if (!available || progress.value) return; update.value = await invoke<LauncherUpdate>('check_update'); }
function showUpdate(required = false) { if (busy.value) return; updateRequired.value = required; promptError.value = ''; prompt.value = 'update'; }
function cancelPrompt() { if (busy.value || progress.value) return; prompt.value = null; requestedCode.value = null; promptError.value = ''; }
async function requestLaunch(code: string | null = null) {
if (!available || busy.value || pendingJoin.value || prompt.value) return;
busy.value = true; failure.value = ''; requestedCode.value = code;
try { await refresh(); await checkUpdate(); if (update.value.available) { updateRequired.value = true; promptError.value = ''; prompt.value = 'update'; return; } if (code && !status.value?.helperInstalled) { promptError.value = ''; prompt.value = 'helper'; return; } await invoke('launch_game', { code }); await refresh(); }
catch (error) { failure.value = String(error); }
finally { busy.value = false; }
}
async function acceptPrompt() {
if (!prompt.value || busy.value) return;
busy.value = true; failure.value = ''; promptError.value = '';
try {
if (prompt.value === 'update') { progress.value = { phase: 'downloading', downloaded: 0, total: null }; await invoke('install_update'); progress.value = { phase: 'installing', downloaded: progress.value.downloaded, total: progress.value.total }; return; }
await refresh();
if (status.value?.gameRunning) throw new Error('Close Gorilla Tag before downloading the helper. Then try joining again.');
if (!status.value?.bepInExInstalled) throw new Error('Install BepInEx in your Gorilla Tag folder before downloading the helper.');
await invoke('install_join_helper'); await refresh();
if (!status.value?.helperInstalled) throw new Error('The helper installation could not be confirmed. Try again.');
const code = requestedCode.value; prompt.value = null; busy.value = false; await requestLaunch(code);
} catch (error) { progress.value = null; promptError.value = String(error); failure.value = String(error); }
finally { busy.value = false; }
}
 async function openWebsite(path: string) { const url = path.startsWith('/') ? 'https://rankedworld.com' + path : path; if (available) { try { await invoke('open_external', { url }); } catch (error) { failure.value = String(error); } } else if (import.meta.client) window.location.assign(url); } async function signIn() { if (!available || loginPending.value) return; failure.value = ''; const run = ++generation.value; loginPending.value = true; try { login.value = await invoke<SignInInfo>('begin_sign_in'); if (run !== generation.value) return; const ends = Date.now() + login.value.expiresIn * 1000; while (run === generation.value && loginPending.value && Date.now() < ends) { await new Promise(done => setTimeout(done, (login.value?.interval || 5) * 1000)); if (run !== generation.value || !loginPending.value) return; const result = await invoke<string>('poll_sign_in'); if (run !== generation.value) return; if (result === 'approved') { login.value = null; await refresh(); await loadMe(true); await nuxt.runWithContext(() => refreshNuxtData()); return; } if (result === 'expired') break; } failure.value = 'Sign-in expired or was cancelled. Start again when you are ready.'; } catch (error) { if (run === generation.value) failure.value = String(error); } finally { if (run === generation.value) { loginPending.value = false; login.value = null; } } } async function cancelSignIn() { generation.value++; loginPending.value = false; login.value = null; try { await invoke('cancel_sign_in'); } catch (error) { failure.value = String(error); } } return { update, progress, prompt, requestedCode, updateRequired, promptError, checkUpdate, showUpdate, cancelPrompt, requestLaunch, acceptPrompt, enabled, available, status, failure, busy, login, loginPending, pendingJoin, refresh, action, openWebsite, signIn, cancelSignIn }; }
