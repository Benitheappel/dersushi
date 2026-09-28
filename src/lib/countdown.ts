import { t } from "@/content/texts";

export const TARGET_ISO = "2026-10-02T00:00:00+02:00";
export const TARGET_MS = Date.parse(TARGET_ISO);

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export type Remaining = {
  diffMs: number;
  totalSeconds: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
};

export function getRemaining(nowMs: number, targetMs: number = TARGET_MS): Remaining {
  const diffMs = targetMs - nowMs;
  const totalSeconds = Math.max(0, Math.floor(diffMs / SECOND));
  return {
    diffMs,
    totalSeconds,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    done: totalSeconds === 0,
  };
}

export function hourBucket(totalSeconds: number): number {
  return Math.ceil(totalSeconds / 3600);
}

const s = t.eierZerstoerer.sprueche;
const TIERS: [number, string][] = [
  [7 * DAY, s.mehrAls7Tage],
  [3 * DAY, s.mehrAls3Tage],
  [24 * HOUR, s.mehrAls24Stunden],
  [6 * HOUR, s.mehrAls6Stunden],
  [1 * HOUR, s.mehrAls1Stunde],
  [10 * MINUTE, s.mehrAls10Minuten],
  [1 * MINUTE, s.mehrAls1Minute],
];

export function statusMessage(diffMs: number): string {
  if (diffMs <= 0) return s.nachAblauf;
  for (const [threshold, text] of TIERS) if (diffMs > threshold) return text;
  return s.letzteMinute;
}

export function threatLevel(diffMs: number): number {
  if (diffMs <= 0) return 100;
  const p = 1 - diffMs / (7 * DAY);
  return Math.round(Math.min(1, Math.max(0, p)) * 100);
}

export const pad = (n: number, len = 2) => String(n).padStart(len, "0");
