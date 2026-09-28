"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { TARGET_MS, getRemaining, hourBucket, pad, statusMessage, threatLevel } from "@/lib/countdown";
import { readStore, writeStore } from "@/lib/browser";
import { asset } from "@/lib/asset";
import { t } from "@/content/texts";
import styles from "./balls.module.css";

const e = t.eierZerstoerer;

const BELL_SRC = asset("/audio/bell.mp3");
const EXPLODE_MS = 4200;

const viennaFmt = new Intl.DateTimeFormat("de-AT", {
  timeZone: "Europe/Vienna",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function Digits({ value, unit }: { value: string; unit: string }) {
  return (
    <span className={styles.digits}>
      {Array.from(value).map((d, i) => (
        <span key={`${unit}-${i}-${d}`} className={styles.digit}>
          {d}
        </span>
      ))}
    </span>
  );
}

export default function BallsDestroyer() {
  const [now, setNow] = useState<number | null>(null);
  const [sound, setSound] = useState<"off" | "on">("off");
  const [needsGesture, setNeedsGesture] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [ringing, setRinging] = useState(false);
  const [exploding, setExploding] = useState(false);
  const [announce, setAnnounce] = useState("");
  const [simulated, setSimulated] = useState<number | null>(null);
  const [localTarget, setLocalTarget] = useState("");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const soundRef = useRef<"off" | "on">("off");
  const prevBucket = useRef<number | null>(null);
  const offsetRef = useRef(0);
  const bellKey = useRef("bd:lastBell");
  const timers = useRef<number[]>([]);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const getAudio = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(BELL_SRC);
      audioRef.current.preload = "auto";
    }
    return audioRef.current;
  };

  const playBell = useCallback(() => {
    const a = getAudio();
    a.muted = false;
    a.currentTime = 0;
    a.play()
      .then(() => {
        setBlocked(false);
        setNeedsGesture(false);
      })
      .catch(() => setBlocked(true));
  }, []);

  const ring = useCallback(
    (label: string) => {
      setRinging(true);
      later(() => setRinging(false), 1800);
      setAnnounce(label);
      if (soundRef.current === "on") playBell();
    },
    [playBell],
  );

  const explode = useCallback(() => {
    setExploding(true);
    later(() => setExploding(false), EXPLODE_MS);
  }, []);

  useEffect(() => {
    if (readStore("bd:sound") !== "on") return;
    soundRef.current = "on";
    setSound("on");
    setNeedsGesture(true);
    const unlock = () => {
      const a = getAudio();
      a.muted = true;
      a.play()
        .then(() => {
          a.pause();
          a.currentTime = 0;
          a.muted = false;
          setNeedsGesture(false);
          setBlocked(false);
        })
        .catch(() => {
          a.muted = false;
        });
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    const sim = new URLSearchParams(window.location.search).get("simulate");
    if (sim !== null && sim.trim() !== "" && Number.isFinite(Number(sim))) {
      offsetRef.current = TARGET_MS - Number(sim) * 1000 - Date.now();
      bellKey.current = "bd:sim:lastBell";
      setSimulated(Number(sim));
    }
    setLocalTarget(
      new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium" }).format(TARGET_MS) +
        ` (${Intl.DateTimeFormat().resolvedOptions().timeZone})`,
    );

    let timer = 0;
    const tick = () => {
      const t = Date.now() + offsetRef.current;
      setNow(t);
      const { totalSeconds, done } = getRemaining(t);
      const bucket = hourBucket(totalSeconds);
      const prev = prevBucket.current;

      if (prev === null) {
        if (done) explode();
      } else if (bucket < prev) {
        if (readStore(bellKey.current) !== String(bucket)) {
          writeStore(bellKey.current, String(bucket));
          ring(bucket === 0 ? e.nachAblaufGross : `Glocke: noch ${bucket} Stunden.`);
        }
        if (done) explode();
      }
      prevBucket.current = bucket;

      if (!done) timer = window.setTimeout(tick, 1000 - (t % 1000) + 15);
    };
    tick();

    const onVisible = () => {
      if (document.hidden) return;
      clearTimeout(timer);
      tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    const pending = timers.current;
    return () => {
      clearTimeout(timer);
      pending.forEach(clearTimeout);
      document.removeEventListener("visibilitychange", onVisible);
      audioRef.current?.pause();
    };
  }, [ring, explode]);

  const toggleSound = () => {
    if (soundRef.current === "on") {
      soundRef.current = "off";
      setSound("off");
      setBlocked(false);
      writeStore("bd:sound", "off");
      audioRef.current?.pause();
    } else {
      soundRef.current = "on";
      setSound("on");
      writeStore("bd:sound", "on");
      playBell();
    }
  };

  const r = now === null ? null : getRemaining(now);
  const done = r?.done ?? false;
  const threat = r ? threatLevel(r.diffMs) : 0;
  const message = r ? statusMessage(r.diffMs) : "Kalibriere…";
  const nextBell = r && !done ? r.totalSeconds % 3600 || 3600 : 0;
  const values = r ? [r.days, r.hours, r.minutes, r.seconds].map((n) => pad(n)) : ["--", "--", "--", "--"];
  const units = ["d", "h", "m", "s"].map((key, i) => ({ key, label: e.einheiten[i] ?? "", value: values[i] }));
  const spoken = r
    ? `Noch ${r.days} Tage, ${r.hours} Stunden, ${r.minutes} Minuten, ${r.seconds} Sekunden`
    : "Countdown lädt";

  const soundLabel =
    sound === "off" ? e.tonAus : blocked ? e.tonBlockiert : needsGesture ? e.tonKlickNoetig : e.tonAn;

  return (
    <div className={styles.page} data-done={done || undefined} data-exploding={exploding || undefined} data-ringing={ringing || undefined}>
      <div className={styles.scan} aria-hidden="true" />
      <div className={styles.noise} aria-hidden="true" />

      <div className={styles.warnBar} aria-hidden="true">
        <div className={styles.warnTrack}>
          {Array.from({ length: 2 }, (_, k) => (
            <span key={k}>
              {done ? e.warnbandNachAblauf : e.warnband}&nbsp;
            </span>
          ))}
        </div>
      </div>

      {simulated !== null && (
        <p className={styles.sim} role="note">
          SIMULATIONSMODUS — gestartet {simulated} s vor dem Ziel. <a href={asset("/balls-destroyer/")}>Simulation beenden</a>
        </p>
      )}

      <header className={styles.head}>
        <p className="mono">{e.akte}</p>
        <h1 className={`display ${styles.title}`} data-text={done ? e.ueberschriftNachAblauf : e.ueberschrift}>
          {done ? e.ueberschriftNachAblauf : e.ueberschrift}
        </h1>
        <p className={styles.tagline}>
          <span className="mono">{done ? e.unterzeileKleinNachAblauf : e.unterzeileKlein}</span>
          <span className="serif">{done ? e.unterzeileGrossNachAblauf : e.unterzeileGross}</span>
        </p>
      </header>

      {done ? (
        <section className={styles.aftermath} aria-labelledby="gone">
          <p id="gone" className={`display ${styles.gone}`}>
            {e.nachAblaufGross}
          </p>
          <p className={`serif ${styles.safe}`}>{e.nachAblaufSatz}</p>
          <button type="button" className="btn btn--acid" onClick={explode}>
            {e.nachAblaufKnopf}
          </button>
        </section>
      ) : (
        <section aria-label="Countdown">
          <div className={styles.timer} role="timer" aria-label={spoken}>
            {units.map((u, i) => (
              <div key={u.label} className={styles.unit}>
                <Digits value={u.value} unit={u.key} />
                <span className={`mono ${styles.unitLabel}`}>{u.label}</span>
                {i < units.length - 1 && (
                  <span className={styles.colon} aria-hidden="true">
                    :
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className={`serif ${styles.safe}`}>
            {e.satzUnterTimer}
            <Link href="/promises#sushi-promise" className={styles.footnote}>
              {e.fussnote}
            </Link>
          </p>
        </section>
      )}

      <section className={styles.panel} aria-label="Status">
        <dl className={styles.readout}>
          <div>
            <dt>{e.statusSystem}</dt>
            <dd className={styles.blink}>{done ? e.statusSystemAus : e.statusSystemAktiv}</dd>
          </div>
          <div>
            <dt>{e.statusTitel}</dt>
            <dd className={done ? styles.bad : styles.good}>{done ? e.statusZerstoert : e.statusSicher}</dd>
          </div>
          <div>
            <dt>{e.bedrohungsstufe}</dt>
            <dd>
              {threat}%
              <span className={styles.meter} aria-hidden="true">
                <span style={{ transform: `scaleX(${threat / 100})` }} />
              </span>
            </dd>
          </div>
          <div>
            <dt>{e.integritaet}</dt>
            <dd className={done ? styles.bad : undefined}>{done ? "0%" : e.integritaetWert}</dd>
          </div>
          <div className={styles.wide}>
            <dt>{e.systemmeldung}</dt>
            <dd className={styles.message}>{message}</dd>
          </div>
          <div>
            <dt>{e.zielWien}</dt>
            <dd>{viennaFmt.format(TARGET_MS)}</dd>
          </div>
          <div>
            <dt>{e.zielDeineUhr}</dt>
            <dd>{localTarget || "—"}</dd>
          </div>
          <div>
            <dt>{e.naechsteGlocke}</dt>
            <dd>{done ? e.naechsteGlockeNie : r ? `${pad(Math.floor(nextBell / 60))}:${pad(nextBell % 60)}` : "--:--"}</dd>
          </div>
        </dl>

        <div className={styles.controls}>
          <button
            type="button"
            className={`${styles.soundBtn} ${sound === "on" ? styles.soundOn : ""}`}
            aria-pressed={sound === "on"}
            onClick={toggleSound}
          >
            <span className={styles.led} aria-hidden="true" />
            {soundLabel}
          </button>
          {sound === "on" && (
            <button type="button" className={`btn ${blocked ? "btn--acid" : ""}`} onClick={playBell}>
              {blocked ? e.glockeErlauben : e.glockeTesten}
            </button>
          )}
          <p className="mono dim">
            {e.tonHinweis}
          </p>
        </div>
      </section>

      <p className={`display ${styles.panic}`} aria-hidden="true">
        {e.keinePanik}
      </p>

      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}
