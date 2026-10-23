export const SUJETS = [
  { v: "question", l: "Question générale" },
  { v: "bug", l: "Signaler un bug" },
  { v: "phishing", l: "Signaler un phishing" },
  { v: "api", l: "API DataParl'" },
  { v: "presse", l: "Demande presse" },
  { v: "rgpd", l: "Demande RGPD (suppression, droits)" },
  { v: "legal", l: "Demande légale" },
] as const;

export type Sujet = (typeof SUJETS)[number]["v"];
