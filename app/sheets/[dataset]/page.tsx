import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FeuilleGate from "./FeuilleGate";
import { feuille } from "@/lib/sheets";
import { feuillesPubliees } from "@/lib/sheetsPublication";

export const revalidate = 600;

type Props = { params: Promise<{ dataset: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = (await params).dataset;
  const f = feuille(id);
  return f
    ? { title: `${f.titre}, DataParl' Sheets`, description: f.description, alternates: { canonical: `https://media.dataparl.fr/sheets/${f.id}` } }
    : { title: "DataParl' Sheets" };
}

export default async function PageFeuille({ params }: Props) {
  const id = (await params).dataset;
  const f = feuille(id);
  if (!f || !(await feuillesPubliees()).includes(id)) notFound();
  return (
    <>
      <h1>{f.titre}</h1>
      <p className="lead">{f.description}</p>
      <FeuilleGate id={f.id} titre={f.titre} />
    </>
  );
}
