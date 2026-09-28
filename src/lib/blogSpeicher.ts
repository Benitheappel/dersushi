import { pruefen, sortieren, type Beitrag, type BeitragMitSlug } from "@/lib/blog";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const BUCKET = "blog";
const TABELLE = `${url}/rest/v1/blogbeitraege`;
const FELDER = "slug,titel,datum,zusammenfassung,titelbild,entwurf,inhalt";

export class SpeicherFehler extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}

export function speicherFehlt(): string | null {
  if (!url) return "NEXT_PUBLIC_SUPABASE_URL fehlt in .env.local";
  if (!key) return "SUPABASE_SECRET_KEY fehlt in .env.local (siehe README, Abschnitt Blog)";
  return null;
}

const kopf = (): Record<string, string> => (key!.startsWith("sb_") ? { apikey: key! } : { apikey: key!, Authorization: `Bearer ${key}` });

async function pruefeAntwort(r: Response) {
  if (r.ok) return;
  const text = await r.text().catch(() => "");
  if (r.status === 409 || text.includes("23505")) throw new SpeicherFehler("Diese Adresse hat schon ein anderer Beitrag", 409);
  if (/PGRST205|42P01|does not exist|Could not find the table/i.test(text)) throw new SpeicherFehler("Tabelle „blogbeitraege“ fehlt – hast du das Blog-SQL in Supabase ausgeführt?");
  if (/bucket/i.test(text) && r.status === 404) throw new SpeicherFehler("Speicher „blog“ fehlt – hast du das Blog-SQL in Supabase ausgeführt?");
  if (r.status === 401 || r.status === 403) throw new SpeicherFehler("Supabase lehnt ab – stimmt SUPABASE_SECRET_KEY in .env.local?");
  if (text.includes("23514")) throw new SpeicherFehler("Supabase lehnt den Beitrag ab (ungültige Angaben)", 400);
  throw new SpeicherFehler(`Supabase-Fehler ${r.status}`);
}

async function anfrage(pfad: string, init: RequestInit & { headers?: Record<string, string> } = {}) {
  const r = await fetch(pfad, { ...init, cache: "no-store", headers: { ...kopf(), ...init.headers } });
  await pruefeAntwort(r);
  return r;
}

const zeile = (slug: string, b: Beitrag) => ({ slug, ...b, geaendert: new Date().toISOString() });

export async function alleBeitraege(): Promise<BeitragMitSlug[]> {
  const r = await anfrage(`${TABELLE}?select=${FELDER}&order=datum.desc,titel.asc`);
  const daten = (await r.json()) as BeitragMitSlug[];
  return sortieren(daten.flatMap((d) => (typeof pruefen(d) === "string" ? [] : [d])));
}

export async function beitragSpeichern(slug: string, vorher: string | null, b: Beitrag) {
  const json = { "content-type": "application/json", Prefer: "return=representation" };
  if (vorher) {
    const r = await anfrage(`${TABELLE}?slug=eq.${encodeURIComponent(vorher)}`, { method: "PATCH", headers: json, body: JSON.stringify(zeile(slug, b)) });
    if (((await r.json()) as unknown[]).length) return;
  }
  await anfrage(TABELLE, { method: "POST", headers: json, body: JSON.stringify(zeile(slug, b)) });
}

export async function beitragLoeschen(slug: string): Promise<BeitragMitSlug | null> {
  const r = await anfrage(`${TABELLE}?slug=eq.${encodeURIComponent(slug)}`, { method: "DELETE", headers: { Prefer: "return=representation" } });
  return ((await r.json()) as BeitragMitSlug[])[0] ?? null;
}

export async function bildHochladen(name: string, typ: string, daten: Uint8Array) {
  await anfrage(`${url}/storage/v1/object/${BUCKET}/${name}`, {
    method: "POST",
    headers: { "content-type": typ, "cache-control": "max-age=31536000", "x-upsert": "false" },
    body: new Blob([daten as Uint8Array<ArrayBuffer>], { type: typ }),
  });
  return `${url}/storage/v1/object/public/${BUCKET}/${name}`;
}

export async function bilderLoeschen(adressen: string[]) {
  const namen = adressen.map((a) => a.split(`/public/${BUCKET}/`)[1]).filter(Boolean);
  if (!namen.length) return 0;
  await anfrage(`${url}/storage/v1/object/${BUCKET}`, {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prefixes: namen }),
  });
  return namen.length;
}
