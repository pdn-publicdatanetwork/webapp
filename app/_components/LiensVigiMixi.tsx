"use client";
import { useEffect, useRef } from "react";

// Liens VigiParl' / MixiParl' du menu de navigation. Depuis une fiche de
// parlementaire (/parlementaires/<id>, /bio ou /historique), ils pointent
// directement sur l'élu courant (turnover et mixité de SON équipe) au
// lieu de la page d'accueil du module, qui obligeait à re-rechercher le nom.
// Le lien de départ reste le bon même hors fiche (SEO intact : les liens
// servis sans JavaScript restent /vigiparl et /mixiparl).
export default function LiensVigiMixi() {
  const vigi = useRef<HTMLAnchorElement>(null);
  const mixi = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const m = window.location.pathname.match(/^\/parlementaires\/([^/]+?)(?:\/bio|\/historique)?$/);
    if (!m) return;
    const id = m[1];
    if (vigi.current) vigi.current.href = "/vigiparl/" + id;
    if (mixi.current) mixi.current.href = "/mixiparl/" + id;
  }, []);
  return (
    <>
      <a ref={vigi} href="/vigiparl">VigiParl&apos;</a>
      <a ref={mixi} href="/mixiparl">MixiParl&apos;</a>
    </>
  );
}
