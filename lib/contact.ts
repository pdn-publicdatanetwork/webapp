export const SUJETS = [
  { v: "question", l: "Question générale" },
  { v: "erreur", l: "Signaler une erreur de donnée" },
  { v: "bug", l: "Signaler un bug" },
  { v: "phishing", l: "Signaler un phishing" },
  { v: "rgpd", l: "Demande RGPD (suppression, droits)" },
  { v: "api", l: "API DataParl'" },
  { v: "presse", l: "Demande presse" },
  { v: "legal", l: "Demande légale" },
] as const;

export type Sujet = (typeof SUJETS)[number]["v"];
