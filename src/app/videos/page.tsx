import type { Metadata } from "next";
import VideoCard from "@/components/VideoCard";
import { videos } from "@/content/videos";
import { t } from "@/content/texts";
import styles from "./videos.module.css";

const v = t.videos;

export const metadata: Metadata = {
  title: v.browserTitel,
  description: v.untertitel,
};

export default function Videos() {
  const pending = videos.filter((x) => !x.youtubeId).length;
  return (
    <>
      <h1 className="win-h1">{v.ueberschrift}</h1>
      <p className="win-lead">{v.untertitel}</p>
      <p className={styles.meta}>
        {videos.length} {v.baenderGefunden} · {pending} {v.nochInProduktion} · {v.budget}
      </p>
      <hr className="win-rule" />
      <section className={styles.grid} aria-label="Videos">
        {videos.map((x) => (
          <VideoCard key={x.nummer} video={x} />
        ))}
      </section>
    </>
  );
}
