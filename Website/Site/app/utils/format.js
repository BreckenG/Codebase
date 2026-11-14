export function num(n) { return Number(n || 0).toLocaleString(); }
export function short(n) { n = Number(n || 0); if (n >= 1e9) return (n / 1e9).toFixed(2).replace(/\.?0+$/, "") + "B"; if (n >= 1e6) return (n / 1e6).toFixed(2).replace(/\.?0+$/, "") + "M"; if (n >= 1e4) return (n / 1e3).toFixed(1).replace(/\.?0+$/, "") + "K"; return num(n); }
export function ago(iso) { if (!iso || !Number.isFinite(new Date(iso).getTime())) return "Unknown"; const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000)); if (s < 60) return s + " seconds ago"; if (s < 3600) return Math.floor(s / 60) + " minutes ago"; if (s < 86400) return Math.floor(s / 3600) + " hours ago"; const d = Math.floor(s / 86400); if (d === 1) return "yesterday"; return d + " days ago"; }
export function exact(iso) { return iso && Number.isFinite(new Date(iso).getTime()) ? new Date(iso).toLocaleString() : "Unknown"; }
export function tierClass(tier) { const word = String(tier || "bronze").split(" ")[0]; return "t-" + word.toLowerCase(); }
export function money(cents) { return "$" + (Number(cents || 0) / 100).toFixed(2); }
