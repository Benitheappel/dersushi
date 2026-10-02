import { NextResponse } from "next/server";
import {
  alleEinsendungen,
  eigeneHinzufuegen,
  einsendungAendern,
  einsendungLoeschen,
  SpeicherFehler,
  speicherFehlt,
  type Status,
} from "@/lib/wettbewerbAdmin";

export const dynamic = "force-dynamic";

const isDev = process.env.NODE_ENV === "development";
const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const STATUS: Status[] = ["neu", "freigegeben", "abgelehnt"];
const MAX_BYTES = 1024 * 1024;

const fehler = (text: string, status = 400) => NextResponse.json({ error: text }, { status });
const ausFehler = (e: unknown) => fehler((e as Error).message, e instanceof SpeicherFehler ? e.status : 500);
const platzOk = (p: unknown): p is number | null => p === null || (Number.isInteger(p) && (p as number) >= 1 && (p as number) <= 10);

function vorab() {
  if (!isDev) return new NextResponse("Not found", { status: 404 });
  const fehlt = speicherFehlt();
  return fehlt ? fehler(fehlt, 500) : null;
}

export async function GET() {
  const stop = vorab();
  if (stop) return stop;
  try {
    return NextResponse.json(await alleEinsendungen());
  } catch (e) {
    return ausFehler(e);
  }
}

export async function PATCH(req: Request) {
  const stop = vorab();
  if (stop) return stop;
  const body = (await req.json().catch(() => null)) as { id?: unknown; status?: unknown; platz?: unknown } | null;
  if (!body || typeof body.id !== "string" || !ID_RE.test(body.id)) return fehler("Ungültige Einsendung");
  const felder: { status?: Status; platz?: number | null } = {};
  if (body.status !== undefined) {
    if (!STATUS.includes(body.status as Status)) return fehler("Ungültiger Status");
    felder.status = body.status as Status;
  }
  if (body.platz !== undefined) {
    if (!platzOk(body.platz)) return fehler("Platz muss leer oder 1–10 sein");
    felder.platz = body.platz;
  }
  if (!Object.keys(felder).length) return fehler("Nichts zu ändern");
  try {
    await einsendungAendern(body.id, felder);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return ausFehler(e);
  }
}

export async function DELETE(req: Request) {
  const stop = vorab();
  if (stop) return stop;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!ID_RE.test(id)) return fehler("Ungültige Einsendung");
  try {
    return (await einsendungLoeschen(id)) ? NextResponse.json({ ok: true }) : fehler("Einsendung nicht gefunden", 404);
  } catch (e) {
    return ausFehler(e);
  }
}

export async function POST(req: Request) {
  const stop = vorab();
  if (stop) return stop;
  const form = await req.formData().catch(() => null);
  if (!form) return fehler("Ungültige Anfrage");
  const bild = form.get("bild");
  const name = String(form.get("name") ?? "").trim();
  const klasse = String(form.get("klasse") ?? "").trim();
  const vorlage = Number(form.get("vorlage"));
  const platzRoh = String(form.get("platz") ?? "");
  const platz = platzRoh ? Number(platzRoh) : null;

  if (!(bild instanceof Blob) || !["image/webp", "image/jpeg"].includes(bild.type)) return fehler("Bild fehlt oder ist kein WebP/JPEG");
  if (!bild.size || bild.size > MAX_BYTES) return fehler("Bild ist leer oder größer als 1 MB");
  if (name.length < 2 || name.length > 40) return fehler("Name muss 2–40 Zeichen haben");
  if (klasse.length > 12) return fehler("Klasse darf höchstens 12 Zeichen haben");
  if (![1, 2, 3].includes(vorlage)) return fehler("Foto muss 1, 2 oder 3 sein");
  if (!platzOk(platz)) return fehler("Platz muss leer oder 1–10 sein");

  try {
    await eigeneHinzufuegen({ vorlage, name, klasse: klasse || null, platz, typ: bild.type, daten: new Uint8Array(await bild.arrayBuffer()) });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return ausFehler(e);
  }
}
