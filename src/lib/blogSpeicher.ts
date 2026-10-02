import { pruefen, sortieren, type Beitrag, type BeitragMitSlug } from "@/lib/blog";
import { anfrage, SUPABASE_URL } from "@/lib/supabaseAdmin";

export { SpeicherFehler, speicherFehlt } from "@/lib/supabaseAdmin";

const BUCKET = "blog";
const TABELLE = "/rest/v1/blogbeitraege";
const FELDER = "slug,titel,datum,zusammenfassung,titelbild,entwurf,inhalt";

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
  await anfrage(`/storage/v1/object/${BUCKET}/${name}`, {
    method: "POST",
    headers: { "content-type": typ, "cache-control": "max-age=31536000", "x-upsert": "false" },
    body: new Blob([daten as Uint8Array<ArrayBuffer>], { type: typ }),
  });
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${name}`;
}

export async function bilderLoeschen(adressen: string[]) {
  const namen = adressen.map((a) => a.split(`/public/${BUCKET}/`)[1]).filter(Boolean);
  if (!namen.length) return 0;
  await anfrage(`/storage/v1/object/${BUCKET}`, {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prefixes: namen }),
  });
  return namen.length;
}
