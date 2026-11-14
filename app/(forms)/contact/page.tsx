import type { Metadata } from "next";
import DataForm from "./DataForm";
import "./dataform.css";

export const metadata: Metadata = { title: "Contact", alternates: { canonical: "/contact" } };

// Contact unifié (DataForm') : forms.dataparl.fr/contact est l'adresse du
// formulaire pour tout l'écosystème, sur une page détachée du site (groupe
// (forms) : ni en-tête, ni recherche, ni pied de page du site).
// www.dataparl.fr/contact, api.dataparl.fr/contact et jobs.dataparl.fr/contact
// y redirigent en 308 (proxy.ts et jobs/app/contact/page.tsx). ?provenance=
// pré-sélectionne le site d'origine, ?sujet= pré-sélectionne le motif (liens
// de signalement existants), ?message= pré-remplit le détail.
export default async function Contact({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { sujet, provenance, message } = await searchParams;
  return <DataForm sujetInitial={sujet} provenanceInitiale={provenance} messageInitial={message} />;
}
