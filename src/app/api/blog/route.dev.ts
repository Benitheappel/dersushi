import { NextResponse } from "next/server";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { alleBeitraege, BLOG_ORDNER } from "@/content/blog";
import { BILD_IM_TEXT, GRENZEN, pruefen, RESERVIERT, SLUG_RE } from "@/lib/blog";
import { bilderLoeschen, speicherFehlt } from "@/lib/blogSpeicher";

export const dynamic = "force-dynamic";

const isDev = process.env.NODE_ENV === "development";
const notFound = () => new NextResponse("Not found", { status: 404 });
const fehler = (text: string, status = 400) => NextResponse.json({ error: text }, { status });

const slugOk = (s: unknown): s is string => typeof s === "string" && s.length <= GRENZEN.slug && SLUG_RE.test(s) && !RESERVIERT.includes(s);
const datei = (slug: string) => path.join(BLOG_ORDNER, `${slug}.json`);

export async function GET() {
  if (!isDev) return notFound();
  return NextResponse.json(alleBeitraege(true));
}

export async function POST(req: Request) {
  if (!isDev) return notFound();
  let body: { slug?: unknown; vorherSlug?: unknown; beitrag?: unknown };
  try {
    body = await req.json();
  } catch {
    return fehler("Ungültige Anfrage");
  }
  if (!slugOk(body.slug)) return fehler("Adresse ungültig: nur a–z, 0–9 und Bindestriche");
  const vorher = body.vorherSlug === null || body.vorherSlug === undefined ? null : body.vorherSlug;
  if (vorher !== null && !slugOk(vorher)) return fehler("Alte Adresse ungültig");
  const b = pruefen(body.beitrag);
  if (typeof b === "string") return fehler(b);

  if (body.slug !== vorher && existsSync(datei(body.slug))) return fehler("Diese Adresse hat schon ein anderer Beitrag", 409);

  await mkdir(BLOG_ORDNER, { recursive: true });
  const tmp = `${datei(body.slug)}.tmp`;
  await writeFile(tmp, JSON.stringify(b, null, 2) + "\n", "utf8");
  await rename(tmp, datei(body.slug));
  if (vorher && vorher !== body.slug && existsSync(datei(vorher))) await unlink(datei(vorher));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!isDev) return notFound();
  const slug = new URL(req.url).searchParams.get("slug");
  if (!slugOk(slug) || !existsSync(datei(slug))) return fehler("Beitrag nicht gefunden", 404);

  const alt = await readFile(datei(slug), "utf8");
  await unlink(datei(slug));

  const nochBenutzt = new Set(alleBeitraege(true).flatMap((p) => `${p.titelbild} ${p.inhalt}`.match(BILD_IM_TEXT()) ?? []));
  const weg = [...new Set(alt.match(BILD_IM_TEXT()) ?? [])].filter((bild) => !nochBenutzt.has(bild));
  if (!weg.length || speicherFehlt()) return NextResponse.json({ ok: true, bilderGeloescht: 0 });
  try {
    return NextResponse.json({ ok: true, bilderGeloescht: await bilderLoeschen(weg) });
  } catch (e) {
    return NextResponse.json({ ok: true, bilderGeloescht: 0, warnung: (e as Error).message });
  }
}
