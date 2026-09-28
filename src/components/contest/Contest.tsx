"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import Paint, { type Compressed, type PaintHandle } from "@/components/paint/Paint";
import { EMAIL_RE, loadHallOfFame, submitEntry, SubmitError, supabaseReady, type Einsendung } from "@/lib/supabase";
import { readStore, writeStore } from "@/lib/browser";
import { t } from "@/content/texts";
import styles from "./contest.module.css";

const w = t.wettbewerb;
const DONE_KEY = "wettbewerb:eingesendet";

type SendState = "idle" | "sending" | "done" | "error" | "already" | "invalid";

const kb = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024))} KB`;

function SubmitDialog({ handle, onClose, onSent }: { handle: PaintHandle; onClose: () => void; onSent: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [klasse, setKlasse] = useState("");
  const [age, setAge] = useState(false);
  const [agree, setAgree] = useState(false);
  const [touched, setTouched] = useState(false);
  const [state, setState] = useState<SendState>("idle");
  const [preview, setPreview] = useState<{ url: string; size: number; ext: string } | null>(null);
  const imageRef = useRef<Compressed | null>(null);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let url = "";
    let cancelled = false;
    const id = window.setTimeout(async () => {
      const img = await handle.exportSigned(name);
      if (cancelled || !img) return;
      imageRef.current = img;
      url = URL.createObjectURL(img.blob);
      setPreview({ url, size: img.blob.size, ext: img.ext });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(id);
      if (url) URL.revokeObjectURL(url);
    };
  }, [handle, name]);

  useEffect(() => {
    firstRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const nameOk = name.trim().length >= 2 && name.trim().length <= 40;
  const emailOk = EMAIL_RE.test(email.trim()) && email.trim().length <= 120;
  const ready = nameOk && emailOk && age && agree && !!preview;

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!ready || !imageRef.current || state === "sending") return;
    setState("sending");
    try {
      const final = (await handle.exportSigned(name)) ?? imageRef.current;
      await submitEntry(final, { vorlage: handle.template, name, email, klasse });
      writeStore(DONE_KEY, "1");
      setState("done");
      onSent();
    } catch (err) {
      const reason = err instanceof SubmitError ? err.reason : "failed";
      if (reason === "already") writeStore(DONE_KEY, "1");
      setState(reason === "already" ? "already" : reason === "invalid" ? "invalid" : "error");
    }
  };

  const message =
    state === "sending"
      ? w.sendet
      : state === "error"
        ? w.sendeFehler
        : state === "already"
          ? w.schonTeilgenommen
          : state === "invalid"
            ? w.ungueltig
            : "";

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className={`win-panel ${styles.dialog}`} role="dialog" aria-modal="true" aria-labelledby="send-title" onSubmit={send} noValidate>
        <div className="win-titlebar">
          <h2 id="send-title" style={{ font: "inherit" }}>
            {w.einsendenUeberschrift}
          </h2>
          <button type="button" className={styles.x} aria-label={w.abbrechenKnopf} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className={styles.dialogBody}>
          {state === "done" ? (
            <>
              {preview && <img src={preview.url} alt="Dein eingesendetes Bild" className={styles.preview} />}
              <p className={styles.ok}>{w.gesendet}</p>
            </>
          ) : (
            <>
              <p className={styles.small}>{w.vorschauHinweis}</p>
              {preview ? (
                <figure className={styles.previewWrap}>
                  <img src={preview.url} alt="Vorschau deines Bildes mit Signatur" className={styles.preview} />
                  <figcaption>
                    {preview.ext.toUpperCase()} · {kb(preview.size)}
                  </figcaption>
                </figure>
              ) : (
                <p className={styles.small}>…</p>
              )}

              <label className={styles.field}>
                {w.nameFeld}
                <input
                  ref={firstRef}
                  value={name}
                  maxLength={40}
                  autoComplete="nickname"
                  aria-invalid={touched && !nameOk}
                  onChange={(e) => setName(e.target.value)}
                />
                {touched && !nameOk && <span className={styles.err}>{w.pruefeName}</span>}
              </label>
              <label className={styles.field}>
                {w.emailFeld}
                <input
                  type="email"
                  value={email}
                  maxLength={120}
                  autoComplete="email"
                  aria-invalid={touched && !emailOk}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {touched && !emailOk && <span className={styles.err}>{w.pruefeEmail}</span>}
              </label>
              <label className={styles.field}>
                {w.klasseFeld}
                <input value={klasse} maxLength={12} onChange={(e) => setKlasse(e.target.value)} />
              </label>

              <label className={styles.agree}>
                <input type="checkbox" checked={age} onChange={(e) => setAge(e.target.checked)} />
                <span>{w.mindestalter}</span>
              </label>
              <label className={styles.agree}>
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                <span>
                  {w.einverstanden}{" "}
                  <Link href="/datenschutz" target="_blank">
                    {w.datenschutzLink}
                  </Link>
                </span>
              </label>
              <p className={styles.small}>{w.regelnHinweis}</p>
              {message && (
                <p className={styles.msg} role="status">
                  {message}
                </p>
              )}
            </>
          )}
          <div className={styles.buttons}>
            {state !== "done" && state !== "already" && (
              <button type="submit" className="btn" disabled={!ready || state === "sending"}>
                {w.absendenKnopf}
              </button>
            )}
            <button type="button" className="btn" onClick={onClose}>
              {state === "done" || state === "already" ? "OK" : w.abbrechenKnopf}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function HallOfFame() {
  const [entries, setEntries] = useState<(Einsendung & { url: string })[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!supabaseReady) return;
    loadHallOfFame()
      .then(setEntries)
      .catch(() => setError(true));
  }, []);

  if (!supabaseReady) return <p className={styles.note}>{w.galerieNichtVerbunden}</p>;
  if (error) return <p className={styles.note}>{w.galerieFehler}</p>;
  if (!entries) return <p className={styles.note}>…</p>;
  if (!entries.length) return <p className={styles.note}>{w.galerieLeer}</p>;

  return (
    <ul className={styles.gallery}>
      {entries.map((e) => (
        <li key={e.id} className={`win-panel ${styles.card}`} data-platz={e.platz ?? undefined}>
          <div className="win-titlebar">
            <span>{e.platz ? `★ ${e.platz}. ${w.platz}` : `FOTO_${e.vorlage}`}</span>
          </div>
          <img src={e.url} alt={`Einsendung von ${e.name || w.anonym}`} loading="lazy" />
          <p className={styles.by}>
            <strong>{e.name || w.anonym}</strong>
            {e.klasse ? ` · ${e.klasse}` : ""}
          </p>
        </li>
      ))}
    </ul>
  );
}

export default function Contest() {
  const [dialog, setDialog] = useState<PaintHandle | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const closeDialog = useCallback(() => setDialog(null), []);
  const markSent = useCallback(() => setNotice(w.schonTeilgenommenGeraet), []);

  const openSubmit = (h: PaintHandle) => {
    if (!supabaseReady) return setNotice(w.nichtAktiv);
    if (readStore(DONE_KEY)) return setNotice(w.schonTeilgenommenGeraet);
    setNotice(null);
    setDialog(h);
  };

  return (
    <>
      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}
      <Paint onSubmit={openSubmit} />
      {dialog && <SubmitDialog handle={dialog} onClose={closeDialog} onSent={markSent} />}

      <hr className="win-rule" />

      <section aria-labelledby="hof-title">
        <h2 id="hof-title" className="win-h1">
          {w.galerieUeberschrift}
        </h2>
        <HallOfFame />
      </section>
    </>
  );
}
