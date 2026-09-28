import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseReady = Boolean(url && key);

export const BUCKET = "einsendungen";
export const TABLE = "einsendungen";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!supabaseReady) return null;
  client ??= createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

export type Einsendung = {
  id: string;
  created_at: string;
  vorlage: number;
  name: string;
  klasse: string | null;
  bild_pfad: string;
  platz: number | null;
};

export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;

export class SubmitError extends Error {
  constructor(public reason: "not-configured" | "already" | "invalid" | "failed") {
    super(reason);
  }
}

export async function submitEntry(
  image: { blob: Blob; ext: "webp" | "jpg" },
  entry: { vorlage: number; name: string; email: string; klasse: string },
) {
  const sb = getSupabase();
  if (!sb) throw new SubmitError("not-configured");
  const name = entry.name.trim();
  const email = entry.email.trim().toLowerCase();
  if (name.length < 2 || name.length > 40 || !EMAIL_RE.test(email) || email.length > 120) throw new SubmitError("invalid");

  const check = await sb.rpc("email_schon_dabei", { p_email: email });
  if (check.error) throw new SubmitError("failed");
  if (check.data === true) throw new SubmitError("already");

  const path = `${crypto.randomUUID()}.${image.ext}`;
  const up = await sb.storage
    .from(BUCKET)
    .upload(path, image.blob, { contentType: image.ext === "webp" ? "image/webp" : "image/jpeg", upsert: false });
  if (up.error) throw new SubmitError("failed");

  const ins = await sb.from(TABLE).insert({
    vorlage: entry.vorlage,
    name,
    email,
    klasse: entry.klasse.trim() || null,
    bild_pfad: path,
    einverstanden: true,
    mindestalter: true,
  });
  if (ins.error) throw new SubmitError(ins.error.code === "23505" ? "already" : ins.error.code === "23514" ? "invalid" : "failed");
}

export async function loadHallOfFame(): Promise<(Einsendung & { url: string })[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from(TABLE)
    .select("id, created_at, vorlage, name, klasse, bild_pfad, platz")
    .eq("status", "freigegeben")
    .order("platz", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw error;
  if (!data?.length) return [];
  const signed = await sb.storage.from(BUCKET).createSignedUrls(
    data.map((d) => d.bild_pfad),
    60 * 60,
  );
  if (signed.error) throw signed.error;
  const urls = new Map(signed.data.map((s) => [s.path, s.signedUrl]));
  return (data as Einsendung[]).flatMap((d) => (urls.get(d.bild_pfad) ? [{ ...d, url: urls.get(d.bild_pfad)! }] : []));
}
