import type { Metadata } from "next";
import FormulaireContact from "./FormulaireContact";

export const metadata: Metadata = { title: "Contact", alternates: { canonical: "/contact" } };

export default async function Contact({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { sujet } = await searchParams;
  return (
    <>
      <h1 className="ct-h1-cache">Contact</h1>
      <div className="ct-zone"><FormulaireContact sujetInitial={sujet} /></div>
    </>
  );
}
