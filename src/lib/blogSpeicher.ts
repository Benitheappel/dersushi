const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const BUCKET = "blog";

export function speicherFehlt(): string | null {
  if (!url) return "NEXT_PUBLIC_SUPABASE_URL fehlt in .env.local";
  if (!key) return "SUPABASE_SECRET_KEY fehlt in .env.local (siehe README, Abschnitt Blog)";
  return null;
}

const kopf = (): Record<string, string> => (key!.startsWith("sb_") ? { apikey: key! } : { apikey: key!, Authorization: `Bearer ${key}` });

async function pruefeAntwort(r: Response) {
  if (r.ok) return;
  const text = await r.text().catch(() => "");
  const hinweis = r.status === 404 && /bucket/i.test(text) ? " – hast du supabase/blog.sql ausgeführt?" : r.status === 401 || r.status === 403 ? " – stimmt SUPABASE_SECRET_KEY?" : "";
  throw new Error(`Supabase-Fehler ${r.status}${hinweis}`);
}

export async function bildHochladen(name: string, typ: string, daten: Uint8Array) {
  const r = await fetch(`${url}/storage/v1/object/${BUCKET}/${name}`, {
    method: "POST",
    headers: { ...kopf(), "content-type": typ, "cache-control": "max-age=31536000", "x-upsert": "false" },
    body: new Blob([daten as Uint8Array<ArrayBuffer>], { type: typ }),
  });
  await pruefeAntwort(r);
  return `${url}/storage/v1/object/public/${BUCKET}/${name}`;
}

export async function bilderLoeschen(adressen: string[]) {
  const namen = adressen.map((a) => a.split(`/public/${BUCKET}/`)[1]).filter(Boolean);
  if (!namen.length) return 0;
  const r = await fetch(`${url}/storage/v1/object/${BUCKET}`, {
    method: "DELETE",
    headers: { ...kopf(), "content-type": "application/json" },
    body: JSON.stringify({ prefixes: namen }),
  });
  await pruefeAntwort(r);
  return namen.length;
}
