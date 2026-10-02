import { randomUUID } from "node:crypto";
import { anfrage, SUPABASE_URL } from "@/lib/supabaseAdmin";

export { SpeicherFehler, speicherFehlt } from "@/lib/supabaseAdmin";

export type Status = "neu" | "freigegeben" | "abgelehnt";

export type Einsendung = {
  id: string;
  created_at: string;
  vorlage: number;
  name: string;
  email: string | null;
  klasse: string | null;
  bild_pfad: string;
  status: Status;
  platz: number | null;
  url: string | null;
};

const TABELLE = "/rest/v1/einsendungen";
const BUCKET = "einsendungen";
const FELDER = "id,created_at,vorlage,name,email,klasse,bild_pfad,status,platz";

export async function alleEinsendungen(): Promise<Einsendung[]> {
  const r = await anfrage(`${TABELLE}?select=${FELDER}&order=created_at.desc&limit=2000`);
  const liste = (await r.json()) as Omit<Einsendung, "url">[];
  if (!liste.length) return [];
  const s = await anfrage(`/storage/v1/object/sign/${BUCKET}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ expiresIn: 60 * 60 * 6, paths: liste.map((e) => e.bild_pfad) }),
  });
  const urls = new Map(((await s.json()) as { path: string; signedURL: string | null }[]).map((x) => [x.path, x.signedURL]));
  return liste.map((e) => {
    const signed = urls.get(e.bild_pfad);
    return { ...e, url: signed ? `${SUPABASE_URL}/storage/v1${signed}` : null };
  });
}

export async function einsendungAendern(id: string, felder: { status?: Status; platz?: number | null }) {
  await anfrage(`${TABELLE}?id=eq.${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(felder),
  });
}

export async function einsendungLoeschen(id: string) {
  const r = await anfrage(`${TABELLE}?id=eq.${id}`, { method: "DELETE", headers: { Prefer: "return=representation" } });
  const alt = ((await r.json()) as { bild_pfad: string }[])[0];
  if (!alt) return false;
  await anfrage(`/storage/v1/object/${BUCKET}`, {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prefixes: [alt.bild_pfad] }),
  });
  return true;
}

export async function eigeneHinzufuegen(e: { vorlage: number; name: string; klasse: string | null; platz: number | null; typ: string; daten: Uint8Array }) {
  const bild_pfad = `${randomUUID()}.${e.typ === "image/webp" ? "webp" : "jpg"}`;
  await anfrage(`/storage/v1/object/${BUCKET}/${bild_pfad}`, {
    method: "POST",
    headers: { "content-type": e.typ, "x-upsert": "false" },
    body: new Blob([e.daten as Uint8Array<ArrayBuffer>], { type: e.typ }),
  });
  try {
    await anfrage(TABELLE, {
      method: "POST",
      headers: { "content-type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({
        vorlage: e.vorlage,
        name: e.name,
        email: null,
        klasse: e.klasse,
        bild_pfad,
        einverstanden: true,
        mindestalter: true,
        status: "freigegeben",
        platz: e.platz,
      }),
    });
  } catch (err) {
    await anfrage(`/storage/v1/object/${BUCKET}`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prefixes: [bild_pfad] }),
    }).catch(() => {});
    throw err;
  }
}
