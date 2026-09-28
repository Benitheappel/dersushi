import texts from "./texts.json";

export const t = texts;

export const isEmpty = (v: string | null | undefined) => !v || !v.trim();
