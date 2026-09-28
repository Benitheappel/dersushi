import { NextResponse } from "next/server";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

const FILES = {
  texts: "texts.json",
  profile: "profile.json",
  promises: "promises.json",
  videos: "videos.json",
} as const;
type FileKey = keyof typeof FILES;

const dir = path.join(process.cwd(), "src", "content");
const isDev = process.env.NODE_ENV === "development";
const notFound = () => new NextResponse("Not found", { status: 404 });

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
const isObj = (v: unknown): v is Record<string, Json> => v !== null && typeof v === "object" && !Array.isArray(v);

function listTemplate(items: Json[]): Json | undefined {
  if (!items.length) return undefined;
  if (!items.every(isObj)) return items[0];
  const merged: Record<string, Json> = {};
  for (const item of items as Record<string, Json>[]) for (const [k, v] of Object.entries(item)) if (!(k in merged)) merged[k] = v;
  return merged;
}

function sameShape(oldV: Json, newV: unknown, at: string): string | null {
  if (Array.isArray(oldV)) {
    if (!Array.isArray(newV)) return `${at}: Liste erwartet`;
    const template = listTemplate(oldV);
    if (template === undefined) return null;
    for (let i = 0; i < newV.length; i++) {
      const err = sameShape(template, newV[i], `${at}[${i + 1}]`);
      if (err) return err;
    }
    return null;
  }
  if (isObj(oldV)) {
    if (!isObj(newV)) return `${at}: Objekt erwartet`;
    for (const [k, v] of Object.entries(newV)) {
      if (!(k in oldV)) return `${at}: unbekanntes Feld „${k}“`;
      const err = sameShape(oldV[k], v, `${at}.${k}`);
      if (err) return err;
    }
    return null;
  }
  if (typeof oldV !== typeof newV) return `${at}: ${typeof oldV} erwartet`;
  return null;
}

export async function GET() {
  if (!isDev) return notFound();
  const out: Record<string, unknown> = {};
  for (const [key, file] of Object.entries(FILES)) {
    out[key] = JSON.parse(await readFile(path.join(dir, file), "utf8"));
  }
  return NextResponse.json(out);
}

export async function POST(req: Request) {
  if (!isDev) return notFound();
  let body: { file?: string; data?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }
  const key = body.file as FileKey;
  if (!key || !(key in FILES)) return NextResponse.json({ error: "Unbekannte Datei" }, { status: 400 });

  const target = path.join(dir, FILES[key]);
  const current = JSON.parse(await readFile(target, "utf8"));
  const err = sameShape(current, body.data, key);
  if (err) return NextResponse.json({ error: `Nicht gespeichert — ${err}` }, { status: 400 });

  await writeFile(target, JSON.stringify(body.data, null, 2) + "\n", "utf8");
  return NextResponse.json({ ok: true });
}
