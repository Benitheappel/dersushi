import { pruefen, sortieren, type BeitragMitSlug } from "@/lib/blog";
import { getSupabase } from "@/lib/supabase";

export async function beitraegeLaden(): Promise<BeitragMitSlug[]> {
  if (process.env.NODE_ENV === "development") {
    try {
      const r = await fetch("/api/blog", { cache: "no-store" });
      if (r.ok) return (await r.json()).beitraege;
    } catch {}
  }
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase ist nicht eingerichtet");
  const { data, error } = await sb
    .from("blogbeitraege")
    .select("slug, titel, datum, zusammenfassung, titelbild, entwurf, inhalt")
    .eq("entwurf", false)
    .order("datum", { ascending: false })
    .limit(200);
  if (error) throw error;
  return sortieren(((data ?? []) as BeitragMitSlug[]).filter((d) => typeof pruefen(d) !== "string"));
}
