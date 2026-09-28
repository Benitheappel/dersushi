import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pruefen, SLUG_RE, sortieren, type BeitragMitSlug } from "@/lib/blog";

export const BLOG_ORDNER = path.join(process.cwd(), "src", "content", "blog");

const mitEntwuerfen = process.env.NODE_ENV === "development";

export function alleBeitraege(entwuerfe = mitEntwuerfen): BeitragMitSlug[] {
  if (!existsSync(BLOG_ORDNER)) return [];
  const liste: BeitragMitSlug[] = [];
  for (const datei of readdirSync(BLOG_ORDNER)) {
    const slug = datei.replace(/\.json$/, "");
    if (!datei.endsWith(".json") || !SLUG_RE.test(slug)) continue;
    let b: ReturnType<typeof pruefen>;
    try {
      b = pruefen(JSON.parse(readFileSync(path.join(BLOG_ORDNER, datei), "utf8")));
    } catch {
      b = "Datei ist kein gültiges JSON";
    }
    if (typeof b === "string") {
      if (mitEntwuerfen) {
        console.warn(`Blog-Beitrag ${datei} übersprungen: ${b}`);
        continue;
      }
      throw new Error(`Blog-Beitrag ${datei}: ${b}`);
    }
    if (b.entwurf && !entwuerfe) continue;
    liste.push({ ...b, slug });
  }
  return sortieren(liste);
}

export const beitrag = (slug: string) => alleBeitraege().find((b) => b.slug === slug) ?? null;
