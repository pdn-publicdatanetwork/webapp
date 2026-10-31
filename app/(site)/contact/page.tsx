import type { Metadata } from "next";
import FormulaireContact from "./FormulaireContact";

export const metadata: Metadata = { title: "Contact", alternates: { canonical: "/contact" } };

export default async function Contact({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { sujet } = await searchParams;
  return (
    <>
      <h1><span className="surligne">Contact</span></h1>
      <p className="lead">Une question, une erreur dans les données, une demande presse ou RGPD : un seul formulaire, et une réponse par email.</p>
      <div className="ct-zone"><FormulaireContact sujetInitial={sujet} /></div>
    </>
  );
}
