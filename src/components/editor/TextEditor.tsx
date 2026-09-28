"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SECTIONS, labelFor, type FileKey, type Section } from "./labels";
import styles from "./editor.module.css";

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
type Obj = { [k: string]: Json };
type Data = Record<FileKey, Json>;
type Path = (string | number)[];
type SetFn = (file: FileKey, path: Path, value: Json) => void;

const FILE_KEYS: FileKey[] = ["texts", "profile", "promises", "videos"];
const isObj = (v: Json): v is Obj => v !== null && typeof v === "object" && !Array.isArray(v);

function getIn(v: Json, path: Path): Json {
  let cur: Json = v;
  for (const p of path) {
    if (cur === null || typeof cur !== "object") return null;
    cur = (cur as Record<string | number, Json>)[p] ?? null;
  }
  return cur;
}

function setIn(v: Json, path: Path, value: Json): Json {
  if (!path.length) return value;
  const [head, ...rest] = path;
  if (Array.isArray(v)) {
    const copy = [...v];
    copy[head as number] = setIn(copy[head as number], rest, value);
    return copy;
  }
  const obj = (isObj(v) ? v : {}) as Obj;
  return { ...obj, [head]: setIn(obj[head as string], rest, value) };
}

function blankLike(v: Json): Json {
  if (typeof v === "string") return "";
  if (typeof v === "boolean") return false;
  if (typeof v === "number") return 0;
  if (Array.isArray(v)) return [];
  if (isObj(v)) {
    const out: Obj = {};
    for (const [k, val] of Object.entries(v)) {
      if (k === "_id") out[k] = `neu-${Date.now().toString(36)}`;
      else if (k.startsWith("_")) out[k] = val;
      else out[k] = blankLike(val);
    }
    return out;
  }
  return null;
}

function preview(v: Json): string {
  if (typeof v === "string") return v;
  if (isObj(v)) {
    const first = Object.entries(v).find(([k, x]) => !k.startsWith("_") && typeof x === "string" && x.trim());
    const titel = typeof v.titel === "string" && v.titel.trim() ? v.titel : null;
    const nummer = typeof v.nummer === "string" ? `${v.nummer} — ` : "";
    return nummer + (titel ?? (first ? String(first[1]) : "(leer)"));
  }
  return "";
}

function TextField({ label, value, savedValue, onChange }: { label: string; value: string; savedValue: Json; onChange: (v: string) => void }) {
  const long = value.length > 60 || value.includes("\n");
  const changed = savedValue !== value;
  return (
    <label className={styles.field} data-changed={changed || undefined}>
      <span className={styles.label}>
        {label}
        {changed && <em className={styles.changed}>geändert</em>}
      </span>
      {long ? (
        <textarea
          className={styles.input}
          value={value}
          rows={Math.min(12, Math.max(3, Math.ceil(value.length / 55)))}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input className={styles.input} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

function ListButtons({ index, length, onMove, onRemove }: { index: number; length: number; onMove: (to: number) => void; onRemove: () => void }) {
  const run = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    fn();
  };
  return (
    <span className={styles.itemButtons}>
      <button type="button" title="Nach oben" disabled={index === 0} onClick={run(() => onMove(index - 1))}>
        ↑
      </button>
      <button type="button" title="Nach unten" disabled={index === length - 1} onClick={run(() => onMove(index + 1))}>
        ↓
      </button>
      <button type="button" title="Entfernen" className={styles.remove} onClick={run(onRemove)}>
        ✕
      </button>
    </span>
  );
}

function Node({
  file,
  name,
  value,
  saved,
  path,
  onSet,
}: {
  file: FileKey;
  name: string;
  value: Json;
  saved: Json;
  path: Path;
  onSet: SetFn;
}) {
  const label = labelFor(file, name);
  const set = (v: Json) => onSet(file, path, v);

  if (typeof value === "string") return <TextField label={label} value={value} savedValue={saved} onChange={set} />;

  if (typeof value === "boolean") {
    return (
      <label className={styles.check}>
        <input type="checkbox" checked={value} onChange={(e) => set(e.target.checked)} /> {label}
      </label>
    );
  }

  if (Array.isArray(value)) {
    const move = (from: number, to: number) => {
      const copy = [...value];
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      set(copy);
    };
    const remove = (i: number) => set(value.filter((_, j) => j !== i));
    const savedList = Array.isArray(saved) ? saved : [];
    const stringList = value.every((x) => typeof x === "string");

    if (stringList) {
      return (
        <fieldset className={styles.group}>
          <legend>{label}</legend>
          {value.map((item, i) => (
            <div key={i} className={styles.listRow}>
              <input
                className={styles.input}
                value={item as string}
                data-changed={savedList[i] !== item || undefined}
                onChange={(e) => set(value.map((x, j) => (j === i ? e.target.value : x)))}
              />
              <ListButtons index={i} length={value.length} onMove={(to) => move(i, to)} onRemove={() => remove(i)} />
            </div>
          ))}
          <button type="button" className={styles.add} onClick={() => set([...value, ""])}>
            + Zeile hinzufügen
          </button>
        </fieldset>
      );
    }

    return (
      <fieldset className={styles.group}>
        <legend>{label}</legend>
        {value.map((item, i) => (
          <details key={i} className={styles.card}>
            <summary>
              <span className={styles.cardTitle}>{preview(item)}</span>
              <ListButtons index={i} length={value.length} onMove={(to) => move(i, to)} onRemove={() => remove(i)} />
            </summary>
            <Node file={file} name="" value={item} saved={savedList[i] ?? null} path={[...path, i]} onSet={onSet} />
          </details>
        ))}
        <button type="button" className={styles.add} onClick={() => value[0] !== undefined && set([...value, blankLike(value[0])])}>
          + Eintrag hinzufügen
        </button>
      </fieldset>
    );
  }

  if (isObj(value)) {
    const inner = Object.entries(value)
      .filter(([k]) => !k.startsWith("_"))
      .map(([k, v]) => (
        <Node key={k} file={file} name={k} value={v} saved={isObj(saved) ? (saved[k] ?? null) : null} path={[...path, k]} onSet={onSet} />
      ));
    return name ? (
      <fieldset className={styles.group}>
        <legend>{label}</legend>
        {inner}
      </fieldset>
    ) : (
      <>{inner}</>
    );
  }
  return null;
}

type Hit = { file: FileKey; path: Path; crumbs: string[]; value: string };

function collect(file: FileKey, v: Json, path: Path, crumbs: string[], out: Hit[]) {
  if (typeof v === "string") out.push({ file, path, crumbs, value: v });
  else if (Array.isArray(v)) v.forEach((x, i) => collect(file, x, [...path, i], [...crumbs, `#${i + 1}`], out));
  else if (isObj(v))
    for (const [k, x] of Object.entries(v)) if (!k.startsWith("_")) collect(file, x, [...path, k], [...crumbs, labelFor(file, k)], out);
}

const sectionForRoute = (pathname: string) =>
  SECTIONS.find((s) => s.routes?.some((r) => (r === "/" ? pathname === "/" : pathname.startsWith(r))))?.id ?? "ueberall";

export default function TextEditor() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<Data | null>(null);
  const [draft, setDraft] = useState<Data | null>(null);
  const [section, setSection] = useState(() => sectionForRoute(pathname));
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "ok" | "error"; msg?: string }>({ kind: "idle" });

  const load = useCallback(async () => {
    const res = await fetch("/api/texte", { cache: "no-store" });
    if (!res.ok) throw new Error("Laden fehlgeschlagen");
    const data = (await res.json()) as Data;
    setSaved(data);
    setDraft(data);
  }, []);

  useEffect(() => {
    if (open && !saved) load().catch((e) => setStatus({ kind: "error", msg: String(e.message ?? e) }));
  }, [open, saved, load]);

  useEffect(() => setSection(sectionForRoute(pathname)), [pathname]);

  useEffect(() => {
    document.querySelector(`[data-section="${section}"]`)?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [section, open]);

  const dirty = useMemo(
    () => (saved && draft ? FILE_KEYS.filter((k) => JSON.stringify(saved[k]) !== JSON.stringify(draft[k])) : []),
    [saved, draft],
  );

  const onSet: SetFn = useCallback((file, path, value) => {
    setDraft((d) => (d ? { ...d, [file]: setIn(d[file], path, value) } : d));
    setStatus({ kind: "idle" });
  }, []);

  const save = useCallback(async () => {
    if (!draft || !dirty.length) return;
    setStatus({ kind: "saving" });
    for (const file of dirty) {
      const res = await fetch("/api/texte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file, data: draft[file] }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setStatus({ kind: "error", msg: body.error ?? `Fehler beim Speichern (${res.status})` });
        return;
      }
    }
    setSaved(draft);
    setStatus({ kind: "ok", msg: "Gespeichert ✓ — die Seite aktualisiert sich gleich." });
    router.refresh();
  }, [draft, dirty, router]);

  const discard = () => {
    setDraft(saved);
    setStatus({ kind: "idle" });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      } else if (e.key === "Escape") setOpen(false);
    };
    const onLeave = (e: BeforeUnloadEvent) => {
      if (dirty.length) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onLeave);
    };
  }, [open, save, dirty.length]);

  const current: Section = SECTIONS.find((s) => s.id === section) ?? SECTIONS[0];

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !draft) return [];
    const out: Hit[] = [];
    for (const s of SECTIONS) collect(s.file, getIn(draft[s.file], s.path), s.path, [s.label], out);
    return out.filter((h) => h.value.toLowerCase().includes(q) || h.crumbs.join(" ").toLowerCase().includes(q)).slice(0, 80);
  }, [query, draft]);

  return (
    <>
      <button type="button" className={styles.fab} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        ✎ TEXTE
        {dirty.length > 0 && <span className={styles.dot} aria-label="ungespeicherte Änderungen" />}
      </button>

      {open && (
        <aside className={styles.panel} role="dialog" aria-label="Texte bearbeiten">
          <header className={styles.head}>
            <div>
              <h2>Texte bearbeiten</h2>
              <p>Nach dem Speichern ändert sich die Seite sofort. Dieses Menü gibt es nur bei dir lokal.</p>
            </div>
            <button type="button" className={styles.close} onClick={() => setOpen(false)} aria-label="Schließen">
              ✕
            </button>
          </header>

          <input
            className={`${styles.input} ${styles.search}`}
            type="search"
            placeholder="Suchen — z. B. ein Wort, das du auf der Seite siehst"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          {!query && (
            <nav className={styles.chips} aria-label="Bereiche">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={styles.chip}
                  aria-pressed={s.id === section}
                  data-section={s.id}
                  data-dirty={dirty.includes(s.file) || undefined}
                  onClick={() => setSection(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </nav>
          )}

          <div className={styles.body}>
            {!draft || !saved ? (
              <p className={styles.muted}>{status.kind === "error" ? status.msg : "Lade Texte…"}</p>
            ) : query ? (
              hits.length ? (
                hits.map((h) => (
                  <div key={`${h.file}:${h.path.join(".")}`} className={styles.hit}>
                    <p className={styles.crumbs}>{h.crumbs.slice(0, -1).join(" › ")}</p>
                    <TextField
                      label={h.crumbs[h.crumbs.length - 1]}
                      value={getIn(draft[h.file], h.path) as string}
                      savedValue={getIn(saved[h.file], h.path)}
                      onChange={(v) => onSet(h.file, h.path, v)}
                    />
                  </div>
                ))
              ) : (
                <p className={styles.muted}>Nichts gefunden.</p>
              )
            ) : (
              <Node
                file={current.file}
                name=""
                value={getIn(draft[current.file], current.path)}
                saved={getIn(saved[current.file], current.path)}
                path={current.path}
                onSet={onSet}
              />
            )}
          </div>

          <footer className={styles.foot}>
            <p className={styles.status} data-kind={status.kind} role="status">
              {status.kind === "saving"
                ? "Speichere…"
                : status.msg ?? (dirty.length ? "Ungespeicherte Änderungen" : "Alles gespeichert")}
            </p>
            {dirty.length > 0 && (
              <button type="button" className={styles.secondary} onClick={discard}>
                Verwerfen
              </button>
            )}
            <button type="button" className={styles.primary} onClick={save} disabled={!dirty.length || status.kind === "saving"}>
              Speichern <kbd>Strg+S</kbd>
            </button>
          </footer>
        </aside>
      )}
    </>
  );
}
