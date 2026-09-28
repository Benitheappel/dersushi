"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { bildUrl, GRENZEN, heute, lesezeit, RESERVIERT, slugify, SLUG_RE, woerter, type Beitrag, type BeitragMitSlug } from "@/lib/blog";
import Artikel from "./Artikel";
import styles from "./writer.module.css";

const leer = (): Beitrag => ({ titel: "", datum: heute(), zusammenfassung: "", titelbild: "", entwurf: true, inhalt: "" });

const MAX_SEITE = 1600;
const toBlob = (c: HTMLCanvasElement, type: string, q: number) => new Promise<Blob | null>((r) => c.toBlob(r, type, q));

async function verkleinern(file: File): Promise<Blob> {
  if (file.type === "image/gif") return file;
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, MAX_SEITE / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * s);
  c.height = Math.round(bmp.height * s);
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  let blob = await toBlob(c, "image/webp", 0.85);
  if (blob?.type !== "image/webp") {
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    blob = await toBlob(c, "image/jpeg", 0.85);
  }
  if (!blob) throw new Error("Bild konnte nicht verarbeitet werden");
  const unveraendert = s === 1 && /^image\/(jpeg|webp)$/.test(file.type) && file.size <= blob.size;
  return unveraendert ? file : blob;
}

async function hochladen(file: File): Promise<string> {
  if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) throw new Error(`„${file.name}“ ist kein JPG, PNG, WebP oder GIF`);
  const blob = await verkleinern(file);
  const r = await fetch("/api/blog/bild", { method: "POST", headers: { "content-type": blob.type }, body: blob });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? "Hochladen fehlgeschlagen");
  return j.pfad as string;
}

const bildName = (file: File) =>
  file.name
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_\-]+/g, " ")
    .replace(/[[\]()]/g, "")
    .trim() || "Bildbeschreibung";

type Werkzeug = { label: string; titel: string; aktion: () => void; fett?: boolean; kursiv?: boolean };

export default function BlogEditor() {
  const [liste, setListe] = useState<BeitragMitSlug[]>([]);
  const [b, setB] = useState<Beitrag>(leer);
  const [slug, setSlug] = useState("");
  const [gespeichertAls, setGespeichertAls] = useState<string | null>(null);
  const [slugVonHand, setSlugVonHand] = useState(false);
  const [stand, setStand] = useState(() => JSON.stringify({ ...leer(), slug: "" }));
  const [meldung, setMeldung] = useState<{ text: string; fehler?: boolean } | null>(null);
  const [laedt, setLaedt] = useState(0);
  const [verbindung, setVerbindung] = useState<string | null>(null);
  const [lokal, setLokal] = useState(0);
  const [speichert, setSpeichert] = useState(false);
  const [ansicht, setAnsicht] = useState<"schreiben" | "vorschau">("schreiben");
  const [ziehen, setZiehen] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null);
  const bildInput = useRef<HTMLInputElement>(null);
  const titelbildInput = useRef<HTMLInputElement>(null);

  const geaendert = JSON.stringify({ ...b, slug }) !== stand;

  const listeLaden = useCallback(async () => {
    const r = await fetch("/api/blog", { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setVerbindung(j.error ?? "Keine Verbindung zur Datenbank");
      return [];
    }
    setVerbindung(null);
    setLokal(j.lokal ?? 0);
    setListe(j.beitraege);
    return j.beitraege as BeitragMitSlug[];
  }, []);

  const importieren = async () => {
    setLaedt((n) => n + 1);
    try {
      const r = await fetch("/api/blog", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ import: true }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "Übernehmen fehlgeschlagen");
      await listeLaden();
      const fehler: string[] = j.fehler ?? [];
      setMeldung(
        fehler.length
          ? { text: `Nicht übernommen: ${fehler.join("; ")}`, fehler: true }
          : { text: `${j.uebernommen.length} Beitrag/Beiträge übernommen. Die alten Dateien liegen zur Sicherheit in „blog-backup“.` },
      );
    } catch (e) {
      setMeldung({ text: (e as Error).message, fehler: true });
    } finally {
      setLaedt((n) => n - 1);
    }
  };

  const oeffnen = useCallback((p: BeitragMitSlug | null) => {
    const { slug: s = "", ...rest } = p ?? { ...leer(), slug: "" };
    setB(rest);
    setSlug(s);
    setGespeichertAls(p ? s : null);
    setSlugVonHand(!!p);
    setStand(JSON.stringify({ ...rest, slug: s }));
    setMeldung(null);
    window.history.replaceState(null, "", p ? `?slug=${s}` : window.location.pathname);
  }, []);

  useEffect(() => {
    listeLaden().then((l) => {
      const gesucht = new URLSearchParams(window.location.search).get("slug");
      const p = l.find((x) => x.slug === gesucht);
      if (p) oeffnen(p);
    });
  }, [listeLaden, oeffnen]);

  useEffect(() => {
    if (!geaendert) return;
    const warnen = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warnen);
    return () => window.removeEventListener("beforeunload", warnen);
  }, [geaendert]);

  const wechseln = (p: BeitragMitSlug | null) => {
    if (geaendert && !window.confirm("Ungespeicherte Änderungen verwerfen?")) return;
    oeffnen(p);
  };

  const feld = <K extends keyof Beitrag>(k: K, v: Beitrag[K]) => {
    setB((alt) => ({ ...alt, [k]: v }));
    if (k === "titel" && !slugVonHand) setSlug(slugify(v as string));
  };

  const slugFehler = !slug
    ? "Adresse fehlt"
    : !SLUG_RE.test(slug)
      ? "nur a–z, 0–9 und einzelne Bindestriche"
      : RESERVIERT.includes(slug)
        ? "diese Adresse ist reserviert"
        : liste.some((p) => p.slug === slug && p.slug !== gespeichertAls)
          ? "schon von einem anderen Beitrag benutzt"
          : null;

  const speichern = useCallback(async () => {
    if (speichert) return;
    if (!b.titel.trim()) return setMeldung({ text: "Bitte zuerst einen Titel eingeben.", fehler: true });
    if (slugFehler) return setMeldung({ text: `Adresse: ${slugFehler}.`, fehler: true });
    setSpeichert(true);
    try {
      const r = await fetch("/api/blog", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, vorherSlug: gespeichertAls, beitrag: b }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "Speichern fehlgeschlagen");
      setGespeichertAls(slug);
      setSlugVonHand(true);
      setStand(JSON.stringify({ ...b, slug }));
      window.history.replaceState(null, "", `?slug=${slug}`);
      await listeLaden();
      const zeit = new Date().toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" });
      setMeldung({ text: `Gespeichert um ${zeit}${b.entwurf ? " (Entwurf, nur für dich sichtbar)" : " – ist jetzt online"}.` });
    } catch (e) {
      setMeldung({ text: (e as Error).message, fehler: true });
    } finally {
      setSpeichert(false);
    }
  }, [b, slug, gespeichertAls, slugFehler, speichert, listeLaden]);

  const loeschen = async () => {
    if (!gespeichertAls) return oeffnen(null);
    if (!window.confirm(`„${b.titel}“ wirklich löschen? Das geht nicht rückgängig.`)) return;
    const r = await fetch(`/api/blog?slug=${encodeURIComponent(gespeichertAls)}`, { method: "DELETE" });
    if (!r.ok) return setMeldung({ text: (await r.json().catch(() => ({}))).error ?? "Löschen fehlgeschlagen.", fehler: true });
    await listeLaden();
    oeffnen(null);
    setMeldung({ text: "Beitrag gelöscht." });
  };

  const ersetzen = (start: number, ende: number, text: string, selVon: number, selBis: number) => {
    const el = ta.current!;
    el.focus();
    el.setSelectionRange(start, ende);
    const ok = document.execCommand("insertText", false, text);
    if (!ok) feld("inhalt", el.value.slice(0, start) + text + el.value.slice(ende));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + selVon, start + selBis);
    });
  };

  const umschliessen = (vor: string, nach: string, platzhalter: string) => {
    const el = ta.current!;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const auswahl = value.slice(s, e) || platzhalter;
    ersetzen(s, e, vor + auswahl + nach, vor.length, vor.length + auswahl.length);
  };

  const zeilen = (mach: (zeile: string, i: number) => string, weg: RegExp) => {
    const el = ta.current!;
    const { value } = el;
    const start = value.lastIndexOf("\n", el.selectionStart - 1) + 1;
    let ende = value.indexOf("\n", el.selectionEnd - (el.selectionEnd > el.selectionStart && value[el.selectionEnd - 1] === "\n" ? 1 : 0));
    if (ende === -1) ende = value.length;
    const alle = value.slice(start, ende).split("\n");
    const schonDa = alle.every((z) => weg.test(z) || !z.trim());
    const neu = alle.map((z, i) => (schonDa ? z.replace(weg, "") : mach(z.replace(weg, ""), i))).join("\n");
    ersetzen(start, ende, neu, 0, neu.length);
  };

  const einfuegenBlock = (text: string, selVon: number, selBis: number) => {
    const el = ta.current!;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const vorher = value.slice(0, s);
    const pre = !vorher || vorher.endsWith("\n\n") ? "" : vorher.endsWith("\n") ? "\n" : "\n\n";
    const nach = value.slice(e).startsWith("\n") ? "\n" : "\n\n";
    ersetzen(s, e, pre + text + nach, pre.length + selVon, pre.length + selBis);
  };

  const bilderEinfuegen = async (files: File[]) => {
    const bilder = files.filter((f) => f.type.startsWith("image/"));
    if (!bilder.length) return;
    setLaedt((n) => n + bilder.length);
    setMeldung({ text: `Lade ${bilder.length} Bild${bilder.length > 1 ? "er" : ""} hoch …` });
    for (const f of bilder) {
      try {
        const pfad = await hochladen(f);
        const alt = bildName(f);
        einfuegenBlock(`![${alt}](${pfad})`, 2, 2 + alt.length);
        setMeldung({ text: "Bild eingefügt. Der markierte Text wird zur Bildunterschrift – einfach drüberschreiben." });
      } catch (e) {
        setMeldung({ text: (e as Error).message, fehler: true });
      } finally {
        setLaedt((n) => n - 1);
      }
    }
  };

  const titelbildWaehlen = async (file: File | undefined) => {
    if (!file) return;
    setLaedt((n) => n + 1);
    try {
      feld("titelbild", await hochladen(file));
      setMeldung({ text: "Titelbild gesetzt." });
    } catch (e) {
      setMeldung({ text: (e as Error).message, fehler: true });
    } finally {
      setLaedt((n) => n - 1);
    }
  };

  const link = () => {
    const el = ta.current!;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const text = value.slice(s, e) || "Linktext";
    const url = window.prompt("Wohin soll der Link führen? (z. B. https://… oder /promises)", "https://");
    if (!url || url === "https://") return;
    ersetzen(s, e, `[${text}](${url.trim()})`, 1, 1 + text.length);
  };

  const werkzeuge: (Werkzeug | "|")[] = [
    { label: "F", titel: "Fett (Strg+B)", fett: true, aktion: () => umschliessen("**", "**", "fetter Text") },
    { label: "K", titel: "Kursiv (Strg+I)", kursiv: true, aktion: () => umschliessen("*", "*", "kursiver Text") },
    { label: "S", titel: "Durchgestrichen", aktion: () => umschliessen("~~", "~~", "durchgestrichen") },
    "|",
    { label: "Ü1", titel: "Überschrift", aktion: () => zeilen((z) => `## ${z}`, /^#{1,3}\s+/) },
    { label: "Ü2", titel: "Zwischenüberschrift", aktion: () => zeilen((z) => `### ${z}`, /^#{1,3}\s+/) },
    "|",
    { label: "• Liste", titel: "Aufzählung", aktion: () => zeilen((z) => `- ${z}`, /^\s*[-*+]\s+/) },
    { label: "1. Liste", titel: "Nummerierte Liste", aktion: () => zeilen((z, i) => `${i + 1}. ${z}`, /^\s*\d+[.)]\s+/) },
    { label: "„ Zitat", titel: "Zitat", aktion: () => zeilen((z) => `> ${z}`, /^>\s?/) },
    "|",
    { label: "Link", titel: "Link (Strg+K)", aktion: link },
    { label: "Bild…", titel: "Bild einfügen (oder einfach ins Textfeld ziehen / einfügen)", aktion: () => bildInput.current?.click() },
    { label: "—", titel: "Trennlinie", aktion: () => einfuegenBlock("---", 3, 3) },
  ];

  useEffect(() => {
    const taste = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        speichern();
      }
    };
    window.addEventListener("keydown", taste);
    return () => window.removeEventListener("keydown", taste);
  }, [speichern]);

  const textTaste = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    if (k === "b") umschliessen("**", "**", "fetter Text");
    else if (k === "i") umschliessen("*", "*", "kursiver Text");
    else if (k === "k") link();
    else return;
    e.preventDefault();
  };

  const anzahl = useMemo(() => woerter(b.inhalt), [b.inhalt]);

  return (
    <div className={`win-panel ${styles.app}`}>
      <div className="win-titlebar">
        <span>
          SUSHI WRITER — {b.titel || "Neuer Beitrag"}
          {geaendert ? " *" : ""}
        </span>
      </div>

      <div className={styles.menu}>
        <button type="button" className="btn" onClick={() => wechseln(null)}>
          Neu
        </button>
        <button type="button" className={`btn ${styles.save}`} onClick={speichern} disabled={speichert || laedt > 0} title="Strg+S">
          {speichert ? "Speichert …" : "Speichern"}
        </button>
        {gespeichertAls && (
          <Link className="btn" href={`/blog/lesen?b=${gespeichertAls}`} target="_blank">
            Ansehen ↗
          </Link>
        )}
        <Link className="btn" href="/blog">
          Zur Blog-Übersicht
        </Link>
        <button type="button" className={`btn ${styles.delete}`} onClick={loeschen}>
          {gespeichertAls ? "Löschen" : "Verwerfen"}
        </button>
      </div>

      {verbindung && (
        <p className={styles.banner} data-art="fehler" role="alert">
          <b>Keine Verbindung zur Datenbank:</b> {verbindung}
          <button type="button" className="btn" onClick={listeLaden}>
            Nochmal versuchen
          </button>
        </p>
      )}
      {!verbindung && lokal > 0 && (
        <p className={styles.banner} role="status">
          Auf deinem PC {lokal === 1 ? "liegt noch 1 alter Beitrag" : `liegen noch ${lokal} alte Beiträge`}, die noch nicht in der Datenbank {lokal === 1 ? "ist" : "sind"}.
          <button type="button" className="btn" onClick={importieren} disabled={laedt > 0}>
            In die Datenbank übernehmen
          </button>
        </p>
      )}

      <div className={styles.body}>
        <aside className={styles.side} aria-label="Deine Beiträge">
          <p className={styles.sideHead}>Deine Beiträge ({liste.length})</p>
          <ul className={styles.posts}>
            <li>
              <button type="button" aria-pressed={!gespeichertAls} onClick={() => wechseln(null)}>
                <b>+ Neuer Beitrag</b>
              </button>
            </li>
            {liste.map((p) => (
              <li key={p.slug}>
                <button type="button" aria-pressed={p.slug === gespeichertAls} onClick={() => p.slug !== gespeichertAls && wechseln(p)}>
                  <span className={styles.postTitle}>{p.titel}</span>
                  <span className={styles.postMeta}>
                    {p.datum}
                    {p.entwurf && <span className={styles.badge}>ENTWURF</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className={styles.main}>
          <fieldset className={`win-group ${styles.fields}`}>
            <legend>Beitrag</legend>
            <label className={styles.wide}>
              Titel
              <input
                className={`${styles.input} ${styles.title}`}
                value={b.titel}
                maxLength={GRENZEN.titel}
                placeholder="Worum geht’s?"
                onChange={(e) => feld("titel", e.target.value)}
              />
            </label>
            <label>
              Adresse
              <span className={styles.slugRow}>
                <span className={styles.slugPrefix}>/blog/</span>
                <input
                  className={styles.input}
                  value={slug}
                  maxLength={GRENZEN.slug}
                  aria-invalid={!!slug && !!slugFehler}
                  onChange={(e) => {
                    setSlugVonHand(true);
                    setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
                  }}
                  onBlur={() => setSlug((s) => slugify(s))}
                />
              </span>
              {slug && slugFehler && <span className={styles.err}>{slugFehler}</span>}
            </label>
            <label>
              Datum
              <input className={styles.input} type="date" value={b.datum} onChange={(e) => e.target.value && feld("datum", e.target.value)} />
            </label>
            <label className={styles.wide}>
              Kurzbeschreibung <span className={styles.hint}>(erscheint in der Übersicht, optional)</span>
              <textarea
                className={styles.input}
                rows={2}
                value={b.zusammenfassung}
                maxLength={GRENZEN.zusammenfassung}
                onChange={(e) => feld("zusammenfassung", e.target.value)}
              />
            </label>
            <div className={styles.coverRow}>
              <span className={styles.coverPreview}>
                {b.titelbild ? <img src={bildUrl(b.titelbild) ?? ""} alt="Titelbild" /> : <span>kein Titelbild</span>}
              </span>
              <span className={styles.coverButtons}>
                <button type="button" className="btn" onClick={() => titelbildInput.current?.click()} disabled={laedt > 0}>
                  Titelbild wählen…
                </button>
                {b.titelbild && (
                  <button type="button" className="btn" onClick={() => feld("titelbild", "")}>
                    Entfernen
                  </button>
                )}
              </span>
              <input ref={titelbildInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => (titelbildWaehlen(e.target.files?.[0]), (e.target.value = ""))} />
            </div>
            <fieldset className={styles.publish}>
              <legend className="sr-only">Sichtbarkeit</legend>
              <label className={styles.radio}>
                <input type="radio" name="sichtbarkeit" checked={b.entwurf} onChange={() => feld("entwurf", true)} />
                Entwurf <span className={styles.hint}>(nur für dich sichtbar)</span>
              </label>
              <label className={styles.radio}>
                <input type="radio" name="sichtbarkeit" checked={!b.entwurf} onChange={() => feld("entwurf", false)} />
                Veröffentlichen <span className={styles.hint}>(sofort online nach dem Speichern)</span>
              </label>
            </fieldset>
          </fieldset>

          <div className={styles.toolbar} role="toolbar" aria-label="Formatierung">
            {werkzeuge.map((w, i) =>
              w === "|" ? (
                <span key={i} className={styles.sep} />
              ) : (
                <button
                  key={i}
                  type="button"
                  className={styles.tool}
                  title={w.titel}
                  aria-label={w.titel}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={w.aktion}
                  style={{ fontWeight: w.fett ? 700 : undefined, fontStyle: w.kursiv ? "italic" : undefined, textDecoration: w.label === "S" ? "line-through" : undefined }}
                >
                  {w.label}
                </button>
              ),
            )}
            <input
              ref={bildInput}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              hidden
              onChange={(e) => (bilderEinfuegen([...(e.target.files ?? [])]), (e.target.value = ""))}
            />
            <span className={styles.tabs} role="tablist" aria-label="Ansicht">
              <button type="button" role="tab" aria-selected={ansicht === "schreiben"} onClick={() => setAnsicht("schreiben")}>
                Schreiben
              </button>
              <button type="button" role="tab" aria-selected={ansicht === "vorschau"} onClick={() => setAnsicht("vorschau")}>
                Vorschau
              </button>
            </span>
          </div>

          <div className={styles.panes} data-ansicht={ansicht}>
            <div className={styles.writePane}>
              <textarea
                ref={ta}
                className={styles.text}
                data-ziehen={ziehen || undefined}
                value={b.inhalt}
                spellCheck
                lang="de"
                placeholder={"Hier schreiben …\n\nLeere Zeile = neuer Absatz.\nBilder einfach hier reinziehen oder mit Strg+V einfügen."}
                onChange={(e) => feld("inhalt", e.target.value)}
                onKeyDown={textTaste}
                onPaste={(e) => {
                  const files = [...e.clipboardData.files].filter((f) => f.type.startsWith("image/"));
                  if (files.length) {
                    e.preventDefault();
                    bilderEinfuegen(files);
                  }
                }}
                onDragOver={(e) => {
                  if ([...e.dataTransfer.items].some((it) => it.kind === "file")) {
                    e.preventDefault();
                    setZiehen(true);
                  }
                }}
                onDragLeave={() => setZiehen(false)}
                onDrop={(e) => {
                  setZiehen(false);
                  const files = [...e.dataTransfer.files];
                  if (!files.length) return;
                  e.preventDefault();
                  bilderEinfuegen(files);
                }}
              />
              <details className={styles.help}>
                <summary>Spickzettel</summary>
                <table>
                  <tbody>
                    <tr><td><code>**fett**</code></td><td><b>fett</b></td></tr>
                    <tr><td><code>*kursiv*</code></td><td><i>kursiv</i></td></tr>
                    <tr><td><code>## Überschrift</code></td><td>Überschrift</td></tr>
                    <tr><td><code>- Punkt</code></td><td>Aufzählung</td></tr>
                    <tr><td><code>1. Punkt</code></td><td>Nummerierte Liste</td></tr>
                    <tr><td><code>&gt; Zitat</code></td><td>Zitat</td></tr>
                    <tr><td><code>[Text](https://…)</code></td><td>Link</td></tr>
                    <tr><td><code>![Unterschrift](bild)</code></td><td>Bild mit Bildunterschrift</td></tr>
                    <tr><td><code>---</code></td><td>Trennlinie</td></tr>
                  </tbody>
                </table>
              </details>
            </div>
            <div className={styles.previewPane} aria-label="Vorschau">
              <Artikel b={b} />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.status}>
        <span role="status" className={meldung?.fehler ? styles.statusErr : undefined}>
          {laedt > 0 ? "Lade Bild hoch …" : meldung?.text ?? (geaendert ? "Ungespeicherte Änderungen" : "Alles gespeichert")}
        </span>
        <span>
          {anzahl} Wörter · ca. {lesezeit(b.inhalt)} Min.
        </span>
      </div>
    </div>
  );
}
