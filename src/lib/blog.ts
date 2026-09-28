import { asset } from "@/lib/asset";

export type Beitrag = {
  titel: string;
  datum: string;
  zusammenfassung: string;
  titelbild: string;
  entwurf: boolean;
  inhalt: string;
};

export type BeitragMitSlug = Beitrag & { slug: string };

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const DATUM_RE = /^\d{4}-\d{2}-\d{2}$/;
const SUPABASE_BILD = String.raw`https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/blog/[a-f0-9]+\.(?:webp|jpg|png|gif)`;
export const BILD_RE = new RegExp(`^${SUPABASE_BILD}$`);
export const BILD_IM_TEXT = () => new RegExp(SUPABASE_BILD, "g");

export const bildUrl = (src: string) => (BILD_RE.test(src) ? src : src.startsWith("/") && !src.startsWith("//") ? asset(src) : null);
export const RESERVIERT = ["schreiben"];

export const GRENZEN = { titel: 120, zusammenfassung: 300, inhalt: 100_000, slug: 80 };

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, GRENZEN.slug)
    .replace(/-+$/, "");
}

export function woerter(text: string) {
  return (text.replace(/!\[[^\]]*\]\([^)]*\)/g, " ").match(/[\p{L}\p{N}]+/gu) ?? []).length;
}

export const lesezeit = (text: string) => Math.max(1, Math.round(woerter(text) / 200));

const DATUM_FMT = new Intl.DateTimeFormat("de-AT", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export function datumText(iso: string) {
  if (!DATUM_RE.test(iso)) return iso;
  return DATUM_FMT.format(new Date(`${iso}T00:00:00Z`));
}

export function heute() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function sortieren<T extends Beitrag>(liste: T[]) {
  return [...liste].sort((a, b) => b.datum.localeCompare(a.datum) || a.titel.localeCompare(b.titel, "de"));
}

export function pruefen(v: unknown): Beitrag | string {
  if (!v || typeof v !== "object") return "Ungültiger Beitrag";
  const b = v as Record<string, unknown>;
  const text = (k: string, max: number) => (typeof b[k] === "string" && (b[k] as string).length <= max ? (b[k] as string) : null);
  const titel = text("titel", GRENZEN.titel);
  const zusammenfassung = text("zusammenfassung", GRENZEN.zusammenfassung);
  const inhalt = text("inhalt", GRENZEN.inhalt);
  const datum = text("datum", 10);
  const titelbild = text("titelbild", 200);
  if (titel === null || !titel.trim()) return "Titel fehlt oder ist zu lang";
  if (zusammenfassung === null) return "Kurzbeschreibung ist zu lang";
  if (inhalt === null) return "Text ist zu lang";
  if (datum === null || !DATUM_RE.test(datum)) return "Datum ungültig";
  if (titelbild === null || (titelbild && !BILD_RE.test(titelbild))) return "Titelbild ungültig";
  if (typeof b.entwurf !== "boolean") return "Entwurf-Angabe ungültig";
  return { titel: titel.trim(), datum, zusammenfassung: zusammenfassung.trim(), titelbild, entwurf: b.entwurf, inhalt };
}
