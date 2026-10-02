"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { VORLAGEN } from "@/content/wettbewerb";
import styles from "./verwaltung.module.css";

type Status = "neu" | "freigegeben" | "abgelehnt";

type Einsendung = {
  id: string;
  created_at: string;
  vorlage: number;
  name: string;
  email: string | null;
  klasse: string | null;
  bild_pfad: string;
  status: Status;
  platz: number | null;
  url: string | null;
};

const STATUS_TEXT: Record<Status, string> = { neu: "Neu", freigegeben: "Hall of Fame", abgelehnt: "Abgelehnt" };
const PLAETZE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const SORTIERUNG = {
  neueste: { label: "Neueste zuerst", fn: (a: Einsendung, b: Einsendung) => b.created_at.localeCompare(a.created_at) },
  aelteste: { label: "Älteste zuerst", fn: (a: Einsendung, b: Einsendung) => a.created_at.localeCompare(b.created_at) },
  platz: { label: "Platz", fn: (a: Einsendung, b: Einsendung) => (a.platz ?? 99) - (b.platz ?? 99) || b.created_at.localeCompare(a.created_at) },
  name: { label: "Name A–Z", fn: (a: Einsendung, b: Einsendung) => a.name.localeCompare(b.name, "de") },
};
type Sortierung = keyof typeof SORTIERUNG;

const datum = (iso: string) => new Date(iso).toLocaleString("de-AT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

const toBlob = (c: HTMLCanvasElement, type: string, q: number) => new Promise<Blob | null>((r) => c.toBlob(r, type, q));

async function verkleinern(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, 800 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * s);
  c.height = Math.round(bmp.height * s);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  for (const q of [0.82, 0.7, 0.55]) {
    const webp = await toBlob(c, "image/webp", q);
    const blob = webp?.type === "image/webp" ? webp : await toBlob(c, "image/jpeg", q);
    if (blob && blob.size <= 900 * 1024) return blob;
  }
  throw new Error("Bild ist zu groß, auch nach dem Verkleinern");
}

function NeuDialog({ onClose, onFertig }: { onClose: () => void; onFertig: () => void }) {
  const [datei, setDatei] = useState<File | null>(null);
  const [vorschau, setVorschau] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [klasse, setKlasse] = useState("");
  const [vorlage, setVorlage] = useState(1);
  const [platz, setPlatz] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    const taste = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", taste);
    return () => window.removeEventListener("keydown", taste);
  }, [onClose]);

  useEffect(() => {
    if (!datei) return setVorschau(null);
    const u = URL.createObjectURL(datei);
    setVorschau(u);
    return () => URL.revokeObjectURL(u);
  }, [datei]);

  const ok = !!datei && name.trim().length >= 2 && name.trim().length <= 40 && klasse.trim().length <= 12;

  const absenden = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ok || laeuft) return;
    setLaeuft(true);
    setFehler(null);
    try {
      const form = new FormData();
      form.set("bild", await verkleinern(datei!));
      form.set("name", name.trim());
      form.set("klasse", klasse.trim());
      form.set("vorlage", String(vorlage));
      form.set("platz", platz);
      const r = await fetch("/api/wettbewerb", { method: "POST", body: form });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "Hinzufügen fehlgeschlagen");
      onFertig();
    } catch (err) {
      setFehler((err as Error).message);
    } finally {
      setLaeuft(false);
    }
  };

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className={`win-panel ${styles.dialog}`} role="dialog" aria-modal="true" aria-labelledby="neu-titel" onSubmit={absenden} noValidate>
        <div className="win-titlebar">
          <h2 id="neu-titel" style={{ font: "inherit" }}>
            Eigenes Bild in die Hall of Fame
          </h2>
          <button type="button" className={styles.x} aria-label="Abbrechen" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className={styles.dialogBody}>
          <label className={styles.field}>
            Bild (wird auf max. 800 px verkleinert)
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setDatei(e.target.files?.[0] ?? null)} />
          </label>
          {vorschau && <img src={vorschau} alt="Vorschau" className={styles.preview} />}
          <label className={styles.field}>
            Name / Künstlername
            <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
          </label>
          <div className={styles.row}>
            <label className={styles.field}>
              Klasse (optional)
              <input value={klasse} maxLength={12} onChange={(e) => setKlasse(e.target.value)} />
            </label>
            <label className={styles.field}>
              Foto
              <select value={vorlage} onChange={(e) => setVorlage(Number(e.target.value))}>
                {VORLAGEN.map((v) => (
                  <option key={v.nummer} value={v.nummer}>
                    Foto {v.nummer}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              Platz
              <select value={platz} onChange={(e) => setPlatz(e.target.value)}>
                <option value="">–</option>
                {PLAETZE.map((p) => (
                  <option key={p} value={p}>
                    {p}. Platz
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className={styles.hint}>Das Bild erscheint sofort in der Hall of Fame. Nur Bilder verwenden, die du zeigen darfst.</p>
          {fehler && (
            <p className={styles.error} role="alert">
              {fehler}
            </p>
          )}
          <div className={styles.buttons}>
            <button type="submit" className="btn" disabled={!ok || laeuft}>
              {laeuft ? "Lädt hoch …" : "Hinzufügen"}
            </button>
            <button type="button" className="btn" onClick={onClose}>
              Abbrechen
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function HofVerwaltung() {
  const [liste, setListe] = useState<Einsendung[] | null>(null);
  const [verbindung, setVerbindung] = useState<string | null>(null);
  const [meldung, setMeldung] = useState<{ text: string; fehler?: boolean } | null>(null);
  const [status, setStatus] = useState<Status | "alle">("alle");
  const [vorlage, setVorlage] = useState(0);
  const [klasse, setKlasse] = useState("");
  const [suche, setSuche] = useState("");
  const [sortierung, setSortierung] = useState<Sortierung>("neueste");
  const [nurPlatz, setNurPlatz] = useState(false);
  const [gross, setGross] = useState<Einsendung | null>(null);
  const [neu, setNeu] = useState(false);
  const [beschaeftigt, setBeschaeftigt] = useState<string | null>(null);

  const laden = useCallback(async () => {
    const r = await fetch("/api/wettbewerb", { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setVerbindung(j.error ?? "Keine Verbindung zur Datenbank");
      setListe([]);
      return;
    }
    setVerbindung(null);
    setListe(j);
  }, []);

  useEffect(() => {
    laden();
  }, [laden]);

  useEffect(() => {
    if (!gross) return;
    const taste = (e: KeyboardEvent) => e.key === "Escape" && setGross(null);
    window.addEventListener("keydown", taste);
    return () => window.removeEventListener("keydown", taste);
  }, [gross]);

  const aendern = async (e: Einsendung, felder: { status?: Status; platz?: number | null }, text: string) => {
    setBeschaeftigt(e.id);
    try {
      const r = await fetch("/api/wettbewerb", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: e.id, ...felder }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "Ändern fehlgeschlagen");
      setListe((l) => l?.map((x) => (x.id === e.id ? { ...x, ...felder } : x)) ?? l);
      setMeldung({ text: `„${e.name}“: ${text}` });
    } catch (err) {
      setMeldung({ text: (err as Error).message, fehler: true });
    } finally {
      setBeschaeftigt(null);
    }
  };

  const loeschen = async (e: Einsendung) => {
    if (!window.confirm(`Einsendung von „${e.name}“ endgültig löschen (Eintrag + Bild)?`)) return;
    setBeschaeftigt(e.id);
    try {
      const r = await fetch(`/api/wettbewerb?id=${e.id}`, { method: "DELETE" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "Löschen fehlgeschlagen");
      setListe((l) => l?.filter((x) => x.id !== e.id) ?? l);
      setGross(null);
      setMeldung({ text: `„${e.name}“ gelöscht.` });
    } catch (err) {
      setMeldung({ text: (err as Error).message, fehler: true });
    } finally {
      setBeschaeftigt(null);
    }
  };

  const anzahl = useMemo(() => {
    const z = { alle: 0, neu: 0, freigegeben: 0, abgelehnt: 0 };
    for (const e of liste ?? []) {
      z.alle++;
      z[e.status]++;
    }
    return z;
  }, [liste]);

  const klassen = useMemo(
    () => [...new Set((liste ?? []).map((e) => e.klasse?.trim().toUpperCase()).filter((k): k is string => !!k))].sort((a, b) => a.localeCompare(b, "de")),
    [liste],
  );

  const gefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase();
    return (liste ?? [])
      .filter((e) => status === "alle" || e.status === status)
      .filter((e) => !vorlage || e.vorlage === vorlage)
      .filter((e) => !klasse || e.klasse?.trim().toUpperCase() === klasse)
      .filter((e) => !nurPlatz || e.platz)
      .filter((e) => !q || [e.name, e.email ?? "", e.klasse ?? ""].some((f) => f.toLowerCase().includes(q)))
      .sort(SORTIERUNG[sortierung].fn);
  }, [liste, status, vorlage, klasse, nurPlatz, suche, sortierung]);

  const filterAktiv = status !== "alle" || vorlage || klasse || nurPlatz || suche;

  const zuruecksetzen = () => {
    setStatus("alle");
    setVorlage(0);
    setKlasse("");
    setNurPlatz(false);
    setSuche("");
  };

  return (
    <div className={`win-panel ${styles.app}`}>
      <div className="win-titlebar">
        <span>HALL OF FAME MANAGER — {anzahl.alle} Einsendungen</span>
      </div>

      <div className={styles.menu}>
        <button type="button" className={`btn ${styles.primary}`} onClick={() => setNeu(true)} disabled={!!verbindung}>
          + Eigenes Bild…
        </button>
        <button type="button" className="btn" onClick={() => (setListe(null), laden())}>
          Aktualisieren
        </button>
        <Link className="btn" href="/wettbewerb" target="_blank">
          Wettbewerbsseite ↗
        </Link>
      </div>

      {verbindung && (
        <p className={styles.banner} role="alert">
          <b>Keine Verbindung zur Datenbank:</b> {verbindung}
        </p>
      )}

      <div className={styles.tabs} role="tablist" aria-label="Status">
        {(["alle", "neu", "freigegeben", "abgelehnt"] as const).map((s) => (
          <button key={s} type="button" role="tab" aria-selected={status === s} onClick={() => setStatus(s)}>
            {s === "alle" ? "Alle" : STATUS_TEXT[s]} ({anzahl[s]})
          </button>
        ))}
      </div>

      <div className={styles.filters}>
        <label>
          Foto
          <select value={vorlage} onChange={(e) => setVorlage(Number(e.target.value))}>
            <option value={0}>Alle</option>
            {VORLAGEN.map((v) => (
              <option key={v.nummer} value={v.nummer}>
                Foto {v.nummer}
              </option>
            ))}
          </select>
        </label>
        <label>
          Klasse
          <select value={klasse} onChange={(e) => setKlasse(e.target.value)}>
            <option value="">Alle</option>
            {klassen.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.search}>
          Suche
          <input type="search" value={suche} placeholder="Name, E-Mail oder Klasse" onChange={(e) => setSuche(e.target.value)} />
        </label>
        <label>
          Sortierung
          <select value={sortierung} onChange={(e) => setSortierung(e.target.value as Sortierung)}>
            {Object.entries(SORTIERUNG).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.check}>
          <input type="checkbox" checked={nurPlatz} onChange={(e) => setNurPlatz(e.target.checked)} /> Nur mit Platz
        </label>
        {filterAktiv && (
          <button type="button" className="btn" onClick={zuruecksetzen}>
            Filter zurücksetzen
          </button>
        )}
      </div>

      <div className={styles.workspace}>
        {!liste ? (
          <p className={styles.empty}>Lade Einsendungen …</p>
        ) : !gefiltert.length ? (
          <p className={styles.empty}>{anzahl.alle ? "Keine Einsendung passt zu den Filtern." : "Noch keine Einsendungen."}</p>
        ) : (
          <ul className={styles.grid}>
            {gefiltert.map((e) => (
              <li key={e.id} className={styles.card} data-status={e.status} aria-busy={beschaeftigt === e.id}>
                <button type="button" className={styles.thumb} onClick={() => setGross(e)} title="Groß anzeigen">
                  {e.url ? <img src={e.url} alt={`Einsendung von ${e.name}`} loading="lazy" /> : <span>Bild fehlt</span>}
                  <span className={styles.badge} data-status={e.status}>
                    {e.platz ? `★ ${e.platz}. Platz` : STATUS_TEXT[e.status]}
                  </span>
                </button>
                <div className={styles.info}>
                  <strong>{e.name}</strong>
                  <span>
                    {e.klasse || "keine Klasse"} · Foto {e.vorlage}
                  </span>
                  <span className={styles.small}>{datum(e.created_at)}</span>
                  <span className={styles.small}>{e.email ?? "von dir hinzugefügt"}</span>
                </div>
                <div className={styles.actions}>
                  {e.status !== "freigegeben" && (
                    <button type="button" className="btn" disabled={beschaeftigt === e.id} onClick={() => aendern(e, { status: "freigegeben" }, "in der Hall of Fame")}>
                      ✓ In Hall of Fame
                    </button>
                  )}
                  {e.status === "freigegeben" && (
                    <button type="button" className="btn" disabled={beschaeftigt === e.id} onClick={() => aendern(e, { status: "neu", platz: null }, "aus der Hall of Fame genommen")}>
                      Rausnehmen
                    </button>
                  )}
                  {e.status !== "abgelehnt" && (
                    <button type="button" className="btn" disabled={beschaeftigt === e.id} onClick={() => aendern(e, { status: "abgelehnt", platz: null }, "abgelehnt")}>
                      ✕ Ablehnen
                    </button>
                  )}
                  {e.status === "abgelehnt" && (
                    <button type="button" className="btn" disabled={beschaeftigt === e.id} onClick={() => aendern(e, { status: "neu" }, "zurück auf neu")}>
                      Zurück auf neu
                    </button>
                  )}
                  <label className={styles.platz}>
                    Platz
                    <select
                      value={e.platz ?? ""}
                      disabled={beschaeftigt === e.id}
                      onChange={(ev) => {
                        const p = ev.target.value ? Number(ev.target.value) : null;
                        aendern(e, p ? { platz: p, status: "freigegeben" } : { platz: null }, p ? `${p}. Platz (und in der Hall of Fame)` : "kein Platz mehr");
                      }}
                    >
                      <option value="">–</option>
                      {PLAETZE.map((p) => (
                        <option key={p} value={p}>
                          {p}.
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="button" className={`btn ${styles.delete}`} disabled={beschaeftigt === e.id} onClick={() => loeschen(e)}>
                    Löschen
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.status}>
        <span role="status" className={meldung?.fehler ? styles.statusErr : undefined}>
          {meldung?.text ?? "Bereit"}
        </span>
        <span>
          {gefiltert.length} angezeigt · {anzahl.freigegeben} in der Hall of Fame · {anzahl.neu} neu
        </span>
      </div>

      {gross && (
        <div className={styles.backdrop} role="presentation" onMouseDown={(ev) => ev.target === ev.currentTarget && setGross(null)}>
          <div className={`win-panel ${styles.viewer}`} role="dialog" aria-modal="true" aria-label={`Einsendung von ${gross.name}`}>
            <div className="win-titlebar">
              <span>
                {gross.name}
                {gross.klasse ? ` · ${gross.klasse}` : ""} · Foto {gross.vorlage}
              </span>
              <button type="button" className={styles.x} aria-label="Schließen" onClick={() => setGross(null)}>
                ✕
              </button>
            </div>
            {gross.url && <img src={gross.url} alt={`Einsendung von ${gross.name}`} />}
          </div>
        </div>
      )}

      {neu && (
        <NeuDialog
          onClose={() => setNeu(false)}
          onFertig={() => {
            setNeu(false);
            setMeldung({ text: "Bild hinzugefügt – ist jetzt in der Hall of Fame." });
            laden();
          }}
        />
      )}
    </div>
  );
}
