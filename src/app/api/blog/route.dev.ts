import { NextResponse } from "next/server";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rename } from "node:fs/promises";
import path from "node:path";
import { BILD_IM_TEXT, GRENZEN, pruefen, RESERVIERT, SLUG_RE } from "@/lib/blog";
import { alleBeitraege, beitragLoeschen, beitragSpeichern, bilderLoeschen, SpeicherFehler, speicherFehlt } from "@/lib/blogSpeicher";

export const dynamic = "force-dynamic";

const isDev = process.env.NODE_ENV === "development";
const notFound = () => new NextResponse("Not found", { status: 404 });
const fehler = (text: string, status = 400) => NextResponse.json({ error: text }, { status });
const ausFehler = (e: unknown) => fehler((e as Error).message, e instanceof SpeicherFehler ? e.status : 500);

const LOKAL = path.join(process.cwd(), "src", "content", "blog");
const BACKUP = path.join(process.cwd(), "blog-backup");

const slugOk = (s: unknown): s is string => typeof s === "string" && s.length <= GRENZEN.slug && SLUG_RE.test(s) && !RESERVIERT.includes(s);

async function lokaleDateien() {
  if (!existsSync(LOKAL)) return [];
  return (await readdir(LOKAL)).filter((d) => d.endsWith(".json") && slugOk(d.slice(0, -5)));
}

export async function GET() {
  if (!isDev) return notFound();
  const fehlt = speicherFehlt();
  if (fehlt) return fehler(fehlt, 500);
  try {
    return NextResponse.json({ beitraege: await alleBeitraege(), lokal: (await lokaleDateien()).length });
  } catch (e) {
    return ausFehler(e);
  }
}

export async function POST(req: Request) {
  if (!isDev) return notFound();
  const fehlt = speicherFehlt();
  if (fehlt) return fehler(fehlt, 500);
  let body: { slug?: unknown; vorherSlug?: unknown; beitrag?: unknown; import?: unknown };
  try {
    body = await req.json();
  } catch {
    return fehler("Ungültige Anfrage");
  }

  if (body.import === true) {
    const ergebnis = { uebernommen: [] as string[], fehler: [] as string[] };
    await mkdir(BACKUP, { recursive: true });
    for (const d of await lokaleDateien()) {
      const slug = d.slice(0, -5);
      try {
        const b = pruefen(JSON.parse(await readFile(path.join(LOKAL, d), "utf8")));
        if (typeof b === "string") throw new Error(b);
        await beitragSpeichern(slug, null, b);
        await rename(path.join(LOKAL, d), path.join(BACKUP, d));
        ergebnis.uebernommen.push(slug);
      } catch (e) {
        ergebnis.fehler.push(`${slug}: ${(e as Error).message}`);
      }
    }
    return NextResponse.json(ergebnis);
  }

  if (!slugOk(body.slug)) return fehler("Adresse ungültig: nur a–z, 0–9 und Bindestriche");
  const vorher = body.vorherSlug === null || body.vorherSlug === undefined ? null : body.vorherSlug;
  if (vorher !== null && !slugOk(vorher)) return fehler("Alte Adresse ungültig");
  const b = pruefen(body.beitrag);
  if (typeof b === "string") return fehler(b);

  try {
    await beitragSpeichern(body.slug, vorher, b);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return ausFehler(e);
  }
}

export async function DELETE(req: Request) {
  if (!isDev) return notFound();
  const fehlt = speicherFehlt();
  if (fehlt) return fehler(fehlt, 500);
  const slug = new URL(req.url).searchParams.get("slug");
  if (!slugOk(slug)) return fehler("Beitrag nicht gefunden", 404);

  try {
    const alt = await beitragLoeschen(slug);
    if (!alt) return fehler("Beitrag nicht gefunden", 404);
    const nochBenutzt = new Set((await alleBeitraege()).flatMap((p) => `${p.titelbild} ${p.inhalt}`.match(BILD_IM_TEXT()) ?? []));
    const weg = [...new Set(`${alt.titelbild} ${alt.inhalt}`.match(BILD_IM_TEXT()) ?? [])].filter((bild) => !nochBenutzt.has(bild));
    try {
      return NextResponse.json({ ok: true, bilderGeloescht: await bilderLoeschen(weg) });
    } catch (e) {
      return NextResponse.json({ ok: true, bilderGeloescht: 0, warnung: (e as Error).message });
    }
  } catch (e) {
    return ausFehler(e);
  }
}
