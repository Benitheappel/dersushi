import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { bildHochladen, speicherFehlt } from "@/lib/blogSpeicher";

export const dynamic = "force-dynamic";

const isDev = process.env.NODE_ENV === "development";
const MAX_BYTES = 5 * 1024 * 1024;

const TYPEN: Record<string, { ext: string; passt: (b: Buffer) => boolean }> = {
  "image/webp": { ext: "webp", passt: (b) => b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP" },
  "image/jpeg": { ext: "jpg", passt: (b) => b[0] === 0xff && b[1] === 0xd8 },
  "image/png": { ext: "png", passt: (b) => b.toString("hex", 0, 8) === "89504e470d0a1a0a" },
  "image/gif": { ext: "gif", passt: (b) => b.toString("ascii", 0, 3) === "GIF" },
};

export async function POST(req: Request) {
  if (!isDev) return new NextResponse("Not found", { status: 404 });
  const fehlt = speicherFehlt();
  if (fehlt) return NextResponse.json({ error: fehlt }, { status: 500 });

  const typName = (req.headers.get("content-type") ?? "").split(";")[0].trim();
  const typ = TYPEN[typName];
  if (!typ) return NextResponse.json({ error: "Nur JPG, PNG, WebP oder GIF" }, { status: 415 });
  const daten = Buffer.from(await req.arrayBuffer());
  if (!daten.length || daten.length > MAX_BYTES) return NextResponse.json({ error: "Bild ist leer oder größer als 5 MB" }, { status: 413 });
  if (!typ.passt(daten)) return NextResponse.json({ error: "Datei ist kein gültiges Bild" }, { status: 415 });

  try {
    const pfad = await bildHochladen(`${randomBytes(8).toString("hex")}.${typ.ext}`, typName, daten);
    return NextResponse.json({ pfad });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
