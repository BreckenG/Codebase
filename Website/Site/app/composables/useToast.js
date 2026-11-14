let seq = 0;
export function useToast() { const items = useState("toasts", () => []); function drop(id) { items.value = items.value.filter(t => t.id !== id); } function toast(text, kind) { const id = ++seq; items.value = [...items.value, { id, text, kind: kind || "ok" }]; setTimeout(() => drop(id), 4200); return id; } return { items, toast, drop }; }
