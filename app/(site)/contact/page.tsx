import type { Metadata } from "next";
import DataForm from "./DataForm";
import "./dataform.css";

export const metadata: Metadata = { title: "Contact", alternates: { canonical: "/contact" } };

// Contact unifié (DataForm') : dataparl.fr/contact sert le formulaire pour tout
// l'écosystème ; jobs.dataparl.fr/contact et api.dataparl.fr/contact
// redirigent ici (jobs/app/contact/page.tsx et proxy.ts). ?provenance=
// pré-sélectionne le site d'origine, ?sujet= pré-sélectionne le motif (liens
// de signalement existants), ?message= pré-remplit le détail.
export default async function Contact({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { sujet, provenance, message } = await searchParams;
  return <DataForm sujetInitial={sujet} provenanceInitiale={provenance} messageInitial={message} />;
}
