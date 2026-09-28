import data from "./videos.json";

export type Video = {
  nummer: string;
  titel: string;
  beschreibung: string;
  youtubeId: string;
  dauer: string;
  _groesse: "xl" | "l" | "m" | "s";
};

export const videos = data as Video[];
