"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { COULEUR_CHAMBRE, slugOffre } from "@/lib/jobs";
import { DATA_SUPABASE_KEY, DATA_SUPABASE_URL } from "@/lib/env";
import {
  CHAMBRE_NOM,
  EMAIL_RE,
  dateFr,
  decouper,
  enPuces,
  lieuNormalise,
  nomElu,
  remuneration,
  tempsTravail,
  typeContrat,
} from "@/lib/jobsTexte";
import type { OffreListe } from "@/lib/types";

// Fiche d'une offre : utilisée dans la modal (liste) et sur la page
// canonique /offre/<slug>. Panneau Postuler avec e-mail protégé : il
// n'apparaît dans le DOM qu'après la vérification anti-robot.

function PastilleSource({ connector }: { connector: string }) {
  const parElu = connector === "proposition";
  return parElu ? (
    <span className="bg-emerald-100 text-emerald-800 text-[11px] px-2.5 py-1 rounded-full font-bold border border-emerald-200/60">
      ✨ Déposée par l&apos;élu
    </span>
  ) : (
    <span className="bg-slate-100 text-slate-600 text-[11px] px-2.5 py-1 rounded-full font-medium border border-slate-200">
      Collectée sur les sources officielles
    </span>
  );
}

export default function FicheOffre({ offre, onFermer }: { offre: OffreListe; onFermer?: () => void }) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [contact, setContact] = useState<"ferme" | "verif" | "revele">("ferme");
  const [copie, setCopie] = useState(false);

  useEffect(() => {
    let vivant = true;
    const slug = offre.parlementaire_slug;
    if (!slug) return;
    fetch(
      DATA_SUPABASE_URL + "/rest/v1/parlementaires?select=photo_url&slug=eq." + encodeURIComponent(slug) + "&limit=1",
      { headers: { apikey: DATA_SUPABASE_KEY, Authorization: "Bearer " + DATA_SUPABASE_KEY } }
    )
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: { photo_url: string | null }[]) => vivant && setPhoto(rows?.[0]?.photo_url ?? null))
      .catch(() => {});
    return () => {
      vivant = false;
    };
  }, [offre.parlementaire_slug]);

  const description = offre.description ?? "";
  const { chapeau, blocs } = decouper(description);
  const parTitre = (re: RegExp) => blocs.find((b) => re.test(b.titre));
  const missions = parTitre(/^Vos missions$/i);
  const profil = parTitre(/^Profil recherché$/i);
  const lieu = parTitre(/^Lieu$/i);
  const remun = parTitre(/^R[ée]mun[ée]ration$/i);
  const duree = parTitre(/^Dur[ée]e$/i);
  const candidater = parTitre(/^Pour candidater$/i);

  const contrat = typeContrat(offre);
  const travail = tempsTravail(description);
  const adresse = lieu ? lieuNormalise(lieu.lignes.filter(Boolean).join(" ")) : offre.localisation ?? offre.departement;
  const maps = adresse ? "https://maps.google.com/?q=" + encodeURIComponent(adresse) : null;
  const rem = remun ? remuneration(remun.lignes.filter(Boolean).join(" ")) : null;
  const email = description.match(EMAIL_RE)?.[0] ?? null;
  const objet = encodeURIComponent("Candidature : " + offre.titre);
  const elu = nomElu(offre);
  const lienFiche = offre.parlementaire_slug
    ? "https://www.dataparl.fr/parlementaires/" + offre.parlementaire_slug
    : null;

  const consignes = (candidater?.lignes.filter(Boolean).join(" ") ?? "")
    .replace(EMAIL_RE, "")
    .replace(/\s+à\s*[,;.]/g, ",")
    .replace(/\s*,\s*,/g, ",");
  const consignesPuces = consignes ? enPuces(consignes) : [];

  const copierEmail = async () => {
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      setCopie(true);
      setTimeout(() => setCopie(false), 2500);
    } catch {
      setCopie(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête : photo, titre, élu, badges */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="flex items-start gap-4">
          {photo ? (
            <img src={photo} alt={elu || "Élu"} className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-[#E4BDE9]" />
          ) : (
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0"
              style={{ background: offre.chambre ? COULEUR_CHAMBRE[offre.chambre] ?? "#4E2E53" : "#4E2E53" }}
            >
              {(elu || offre.chambre || "P").slice(0, 1)}
            </div>
          )}
          <div className="space-y-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-serif-title font-bold text-[#4E2E53] leading-snug">
              {offre.titre}
            </h1>
            <p className="text-sm font-semibold text-slate-600 flex flex-wrap items-center gap-1.5">
              <span>{elu || "Équipe parlementaire"}</span>
              {offre.groupe_politique && (<><span className="text-slate-300">•</span><span className="text-[#6C84B0]">{offre.groupe_politique}</span></>)}
              {offre.chambre && (<><span className="text-slate-300">•</span><span className="bg-[#ECF1FC] text-[#4E2E53] px-2.5 py-0.5 rounded-lg text-xs font-bold">{CHAMBRE_NOM[offre.chambre] ?? offre.chambre}</span></>)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-3 mt-3 border-t border-slate-100 text-xs">
          <PastilleSource connector={offre.source_connector} />
          <span className="bg-[#E4BDE9]/40 text-[#4E2E53] font-semibold px-2.5 py-1 rounded-full">{contrat}</span>
          {travail && <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">{travail}</span>}
          <span className="text-slate-400 ml-auto">
            {offre.publie_le ? "Publiée le " + dateFr(offre.publie_le) : "Publication en cours"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          {chapeau.length > 0 && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-2">
              <h2 className="text-sm font-serif-title font-bold text-[#4E2E53]">À propos du poste</h2>
              <p className="text-sm text-slate-700 leading-relaxed">{chapeau.join(" ")}</p>
            </div>
          )}

          {missions && missions.lignes.filter(Boolean).length > 0 && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
              <h2 className="text-sm font-serif-title font-bold text-[#4E2E53]">Missions</h2>
              <ul className="space-y-2 text-sm text-slate-700">
                {missions.lignes.map((l, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-2 h-2 rounded-full bg-[#4E2E53] mt-2 shrink-0" />
                    <span className="leading-relaxed">{l.replace(/^\s*[-•*]\s*/, "")}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {profil && profil.lignes.filter(Boolean).length > 0 && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
              <h2 className="text-sm font-serif-title font-bold text-[#4E2E53]">Profil recherché</h2>
              <ul className="space-y-2 text-sm text-slate-700">
                {enPuces(profil.lignes.map((l) => l.replace(/^\s*[-•*]\s*/, "")).filter(Boolean).join(" ")).map((p, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-2 h-2 rounded-full bg-[#6C84B0] mt-2 shrink-0" />
                    <span className="leading-relaxed">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <h2 className="text-sm font-serif-title font-bold text-[#4E2E53]">Conditions</h2>
            <div className="text-sm text-slate-700 divide-y divide-slate-100">
              <p className="py-2.5 grid grid-cols-[140px_1fr] gap-3">
                <span className="text-[#6C84B0] font-semibold text-xs pt-0.5">Contrat</span>
                <span className="font-medium">{contrat}{travail ? ", " + travail : ""}</span>
              </p>
              {duree && duree.lignes.filter(Boolean).length > 0 && (
                <p className="py-2.5 grid grid-cols-[140px_1fr] gap-3">
                  <span className="text-[#6C84B0] font-semibold text-xs pt-0.5">Durée</span>
                  <span className="font-medium">{duree.lignes.filter(Boolean).join(" ")}</span>
                </p>
              )}
              {adresse && (
                <p className="py-2.5 grid grid-cols-[140px_1fr] gap-3">
                  <span className="text-[#6C84B0] font-semibold text-xs pt-0.5">Lieu</span>
                  <span className="font-medium">
                    {adresse}{" "}
                    {maps && (
                      <a href={maps} target="_blank" rel="noopener noreferrer" className="text-xs text-[#6C84B0] underline font-normal hover:text-[#4E2E53]">
                        Voir sur Google Maps
                      </a>
                    )}
                  </span>
                </p>
              )}
              {rem && (
                <p className="py-2.5 grid grid-cols-[140px_1fr] gap-3">
                  <span className="text-[#6C84B0] font-semibold text-xs pt-0.5">Rémunération</span>
                  <span className="font-medium">
                    {rem.type}{rem.montant ? " : " + rem.montant : ""}
                    {rem.avantages.length > 0 ? ". Avantages : " + rem.avantages.join(", ") : ""}
                  </span>
                </p>
              )}
              {offre.expire_le && (
                <p className="py-2.5 grid grid-cols-[140px_1fr] gap-3">
                  <span className="text-[#6C84B0] font-semibold text-xs pt-0.5">Date limite</span>
                  <span className="font-medium">{dateFr(offre.expire_le)}</span>
                </p>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-2">
            <h2 className="text-sm font-serif-title font-bold text-[#4E2E53]">L&apos;équipe parlementaire</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Équipe de <strong>{elu || "l'élu"}</strong>
              {offre.groupe_politique ? " (" + offre.groupe_politique + ")" : ""}
              {offre.chambre ? ", " + (CHAMBRE_NOM[offre.chambre] ?? offre.chambre) : ""}.
            </p>
            {lienFiche && (
              <a href={lienFiche} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-[#6C84B0] hover:text-[#4E2E53] font-semibold underline pt-1">
                Voir la fiche de l&apos;élu sur DataParl&apos; →
              </a>
            )}
          </div>

          <div className="text-xs text-slate-500 space-y-1 bg-white border border-slate-200 rounded-2xl p-4">
            <p>
              {offre.source_connector === "proposition"
                ? "Offre publiée directement par l'équipe de l'élu, depuis une adresse parlementaire vérifiée."
                : "Offre collectée automatiquement sur les sources officielles et relue avant publication."}
            </p>
            <p>
              Une anomalie ? Écrivez à <a href="mailto:bienvenue@dataparl.fr" className="underline">bienvenue@dataparl.fr</a>.
            </p>
          </div>
        </div>

        {/* Panneau Postuler */}
        <aside className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-md space-y-5 lg:sticky lg:top-28" aria-label="Postuler">
          <div className="space-y-1">
            <h2 className="text-lg font-serif-title font-bold text-[#4E2E53]">Postuler à cette offre</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Transmettez votre candidature à l&apos;équipe parlementaire.
            </p>
          </div>

          {consignesPuces.length > 0 && (
            <div className="bg-[#ECF1FC] border border-[#6C84B0]/20 rounded-2xl p-4 text-xs space-y-2">
              <p className="font-bold text-[#4E2E53]">Consignes de l&apos;équipe :</p>
              <ul className="list-disc pl-4 space-y-1 text-slate-600">
                {consignesPuces.map((p, i) => (<li key={i}>{p}</li>))}
              </ul>
            </div>
          )}

          {contact === "ferme" && (
            <button
              type="button"
              onClick={() => setContact("verif")}
              className="w-full bg-[#4E2E53] hover:bg-[#3b223f] text-white py-3.5 rounded-2xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2"
            >
              ✉️ Contacter l&apos;équipe
            </button>
          )}

          {contact === "verif" && (
            <div className="border border-slate-200 rounded-2xl p-4 text-center space-y-3 bg-slate-50">
              <p className="text-xs font-semibold text-slate-700">Vérification anti-spam</p>
              <p className="text-[11px] text-slate-500">L&apos;adresse e-mail est protégée. Confirmez que vous êtes un candidat.</p>
              <button
                type="button"
                onClick={() => setContact("revele")}
                className="w-full bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors"
              >
                ✅ Je ne suis pas un robot
              </button>
            </div>
          )}

          {contact === "revele" && email && (
            <div className="border border-emerald-200 rounded-2xl p-4 space-y-3 bg-emerald-50/50">
              <p className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">Adresse de candidature :</p>
              <p className="font-mono text-sm font-semibold bg-white p-2.5 rounded-xl border border-emerald-300 text-center select-all">
                {email}
              </p>
              <div className="grid gap-2">
                <a href={"mailto:" + email + "?subject=" + objet} className="w-full bg-[#4E2E53] hover:bg-[#3b223f] text-white py-2.5 rounded-xl font-bold text-xs text-center transition-all">
                  Envoyer ma candidature
                </a>
                <button type="button" onClick={copierEmail} className="w-full border border-slate-300 bg-white py-2.5 rounded-xl font-semibold text-xs hover:bg-slate-50 transition-colors">
                  {copie ? "Adresse copiée ✓" : "Copier l'adresse e-mail"}
                </button>
              </div>
            </div>
          )}

          <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1">
            🔒 E-mail protégé contre le spam
          </p>

          {onFermer ? (
            <p className="text-center text-xs">
              <Link href={"/offre/" + slugOffre(offre)} onClick={onFermer} className="text-[#6C84B0] hover:text-[#4E2E53] underline">
                Ouvrir la page de l&apos;offre →
              </Link>
            </p>
          ) : (
            <p className="text-center text-xs">
              <Link href="/" className="text-[#6C84B0] hover:text-[#4E2E53] underline">← Toutes les offres</Link>
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
