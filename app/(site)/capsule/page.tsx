import type { Metadata } from "next";
import CapsuleClient from "./CapsuleClient";

export const metadata: Metadata = { title: "Mon espace", robots: { index: false, follow: false } };

// Page de la capsule my.dataparl.fr : servie à la racine de my par le proxy
// (réécriture / -> /capsule). Le composant client fait le reste (session,
// cartes de synthèse, navigation).

export default function Page() {
  return <CapsuleClient />;
}
