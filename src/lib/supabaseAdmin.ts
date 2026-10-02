export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

export class SpeicherFehler extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}

export function speicherFehlt(): string | null {
  if (!SUPABASE_URL) return "NEXT_PUBLIC_SUPABASE_URL fehlt in .env.local";
  if (!key) return "SUPABASE_SECRET_KEY fehlt in .env.local";
  return null;
}

const kopf = (): Record<string, string> => (key!.startsWith("sb_") ? { apikey: key! } : { apikey: key!, Authorization: `Bearer ${key}` });

async function pruefeAntwort(r: Response) {
  if (r.ok) return;
  const text = await r.text().catch(() => "");
  if (r.status === 409 || text.includes("23505")) throw new SpeicherFehler("Diese Adresse hat schon ein anderer Beitrag", 409);
  if (/PGRST205|42P01|does not exist|Could not find the table/i.test(text)) throw new SpeicherFehler("Tabelle fehlt in Supabase – hast du das SQL ausgeführt?");
  if (/bucket/i.test(text) && r.status === 404) throw new SpeicherFehler("Speicher fehlt in Supabase – hast du das SQL ausgeführt?");
  if (r.status === 401 || r.status === 403) throw new SpeicherFehler("Supabase lehnt ab – stimmt SUPABASE_SECRET_KEY in .env.local?");
  if (text.includes("23514")) throw new SpeicherFehler("Supabase lehnt die Angaben ab (ungültige Werte)", 400);
  throw new SpeicherFehler(`Supabase-Fehler ${r.status}`);
}

export async function anfrage(pfad: string, init: RequestInit & { headers?: Record<string, string> } = {}) {
  const r = await fetch(`${SUPABASE_URL}${pfad}`, { ...init, cache: "no-store", headers: { ...kopf(), ...init.headers } });
  await pruefeAntwort(r);
  return r;
}
