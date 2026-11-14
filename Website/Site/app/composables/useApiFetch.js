import { isTauri } from '@tauri-apps/api/core';
export function useApiFetch(request, options = {}) { return useFetch(request, { ...options, ...(import.meta.client && isTauri() ? { $fetch: apiFetch } : {}) }); }
