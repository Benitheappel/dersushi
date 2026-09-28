type StoreKind = "local" | "session";

function store(kind: StoreKind): Storage | null {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readStore(key: string, kind: StoreKind = "local"): string | null {
  try {
    return store(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeStore(key: string, value: string, kind: StoreKind = "local") {
  try {
    store(kind)?.setItem(key, value);
  } catch {}
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function hasFinePointer(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export type ToastDetail = { message: string; tone?: "acid" | "alarm" | "paper"; duration?: number };

export function toast(message: string, opts: Omit<ToastDetail, "message"> = {}) {
  window.dispatchEvent(new CustomEvent<ToastDetail>("sushi:toast", { detail: { message, ...opts } }));
}

export function toastOnce(key: string, message: string, opts?: Omit<ToastDetail, "message">) {
  if (readStore(`toast:${key}`, "session")) return;
  writeStore(`toast:${key}`, "1", "session");
  toast(message, opts);
}
