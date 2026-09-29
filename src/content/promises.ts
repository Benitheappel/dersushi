import data from "./promises.json";

export type SubItem = { titel: string; text: string; detailsFolgenStempel: boolean };

export type CampaignPromise = {
  _id: string;
  nummer: string;
  ueberschriftKlein: string;
  titel: string;
  kurzfassung: string;
  absaetze: string[];
  punkte?: SubItem[];
};

export const promises = data.liste as CampaignPromise[];
export const sushiNummer = promises.find((p) => p._id === "sushi-promise")?.nummer ?? "";
export const interlude = data.zwischenruf;
