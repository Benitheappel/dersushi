"use client";

import { useState } from "react";
import type { Video } from "@/content/videos";
import { isEmpty, t } from "@/content/texts";
import styles from "./video.module.css";

function youtubeId(raw: string) {
  const s = raw.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  return s.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/)?.[1] ?? "";
}

export default function VideoCard({ video }: { video: Video }) {
  const [playing, setPlaying] = useState(false);
  const id = youtubeId(video.youtubeId);
  const v = t.videos;
  const title = isEmpty(video.titel) ? null : video.titel;
  const label = title ?? `Video ${video.nummer}`;

  return (
    <article className={`win-panel ${styles.player}`}>
      <div className="win-titlebar">
        <span className={styles.name}>
          ▶ VIDEO_{video.nummer}.MPG{isEmpty(video.dauer) ? "" : ` (${video.dauer})`}
        </span>
      </div>
      <div className={styles.screen}>
        {id && playing ? (
          <iframe
            className={styles.fill}
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
            title={label}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : id ? (
          <div className={`${styles.fill} ${styles.static} ${styles.consent}`}>
            <p>{v.ladenHinweis}</p>
            <button type="button" className="btn" onClick={() => setPlaying(true)}>
              {v.ladenKnopf}
            </button>
          </div>
        ) : (
          <div className={`${styles.fill} ${styles.static}`} role="img" aria-label={`Video ${video.nummer}: noch nicht verfügbar`}>
            <span className={styles.noSignal}>{v.keinSignal}</span>
            <span className={styles.soon}>{v.materialFolgt}</span>
          </div>
        )}
        <span className={styles.rec} aria-hidden="true">
          {v.aufnahme}
        </span>
      </div>
      <div className={styles.info}>
        <h2 className={styles.title}>{title ?? <span className="missing">[TITEL]</span>}</h2>
        <p className={styles.desc}>
          {isEmpty(video.beschreibung) ? <span className="missing">{t.ueberall.platzhalterFehlt}</span> : video.beschreibung}
        </p>
      </div>
    </article>
  );
}
