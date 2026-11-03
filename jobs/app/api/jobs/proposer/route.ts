import { createHash } from "crypto";
import { deposerOffre } from "@/lib/firestore";
import { CHAMBRES, domaineAutorise } from "@/lib/jobs";
import { CONTRATS } from "@/lib/jobsTexte";

export const dynamic = "force-dynamic";

// Dépôt d'une offre depuis l'espace élu. L'empreinte (sha256 de
// l'e-mail de contact + du titre) sert d'identifiant anti-doublon.
// L'offre entre dans la file de relecture (review_status: pending).

const texte = (x: unknown, max = 5000) => (typeof x === "string" ? x.trim().slice(0, max) : "");
const liste = (x: unknown) =>
  Array.isArray(x) ? x.filter((l): l is string => typeof l === "string" && l.trim().length > 0).map((l) => l.trim()).slice(0, 12) : [];

export async function POST(req: Request) {
  const c = (await req.json().catch(() => null)) ?? {};

  const titre = texte(c.titre, 70);
  const email = texte(c.email, 300).toLowerCase();
  const salaire = texte(c.salaire, 200);
  const lieu = texte(c.lieu, 200);
  const elu = texte(c.elu, 100);
  const intro = texte(c.intro);
  const missions = liste(c.missions);
  const profil = liste(c.profil);
  const candidater = texte(c.candidater);
  const chambre = typeof c.chambre === "string" && CHAMBRES.some((x) => x.valeur === c.chambre) ? c.chambre : null;
  const typePoste = typeof c.type_poste === "string" && CONTRATS.includes(c.type_poste) ? c.type_poste : "Autre";
  const temps = texte(c.temps_travail, 30) === "Temps partiel" ? "Temps partiel" : "Temps plein";
  const dateDebut = /^\d{4}-\d{2}-\d{2}$/.test(String(c.date_debut ?? "")) ? String(c.date_debut) : null;
  const dateLimite = /^\d{4}-\d{2}-\d{2}$/.test(String(c.date_limite ?? "")) ? String(c.date_limite) : null;
  const avantages = texte(c.avantages, 300);

  if (!titre || titre.length < 6) return Response.json({ erreur: "intitulé trop court" }, { status: 400 });
  if (!chambre) return Response.json({ erreur: "chambre invalide" }, { status: 400 });
  if (!/\d/.test(salaire)) return Response.json({ erreur: "rémunération transparente obligatoire" }, { status: 400 });
  if (!lieu) return Response.json({ erreur: "lieu obligatoire" }, { status: 400 });
  if (!domaineAutorise(email)) return Response.json({ erreur: "adresse e-mail parlementaire requise" }, { status: 400 });
  if (!elu) return Response.json({ erreur: "nom de l'élu obligatoire" }, { status: 400 });
  if (intro.length < 40) return Response.json({ erreur: "présentation du poste trop courte" }, { status: 400 });
  if (missions.length === 0) return Response.json({ erreur: "au moins une mission" }, { status: 400 });
  if (profil.length === 0) return Response.json({ erreur: "au moins une attente de profil" }, { status: 400 });

  const [prenom, ...reste] = elu.split(/\s+/);
  const nom = reste.join(" ");
  const empreinte = createHash("sha256").update(email + " " + titre.toLowerCase()).digest("hex");

  const description =
    intro +
    "\n\nVos missions :\n" +
    missions.join("\n") +
    "\n\nProfil recherché :\n" +
    profil.join("\n") +
    "\n\nLieu :\n" +
    lieu +
    "\n\nRémunération :\n" +
    salaire +
    (avantages ? ". Avantages : " + avantages : "") +
    "\n\nInformations pratiques :\n" +
    [
      "Temps de travail : " + temps,
      dateDebut ? "Date de début : " + dateDebut : null,
      dateLimite ? "Candidatures jusqu'au : " + dateLimite : null,
    ]
      .filter(Boolean)
      .join("\n") +
    (candidater
      ? "\n\nPour candidater :\nEnvoyer votre candidature à " + email + ". " + candidater
      : "\n\nPour candidater :\nEnvoyer votre candidature à " + email + ".");

  try {
    const res = await deposerOffre(
      {
        titre,
        description,
        chambre,
        type_poste: typePoste,
        localisation: lieu,
        departement: (lieu.match(/\b(\d{2}|0\d{2}|97\d)\b/) ?? [null])[0],
        elu_prenom: prenom ?? null,
        elu_nom: nom || elu,
        groupe_politique: texte(c.groupe, 100) || null,
        contact_email: email,
        salaire,
        temps_travail: temps,
        date_debut: dateDebut,
        expire_le: dateLimite,
        source_connector: "proposition",
        statut: "active",
        review_status: "pending",
        publie_le: null,
        expire_le: null,
      },
      empreinte
    );
    if (res === "doublon") {
      return Response.json({ erreur: "une offre identique a déjà été déposée avec cette adresse" }, { status: 409 });
    }
    return Response.json({
      ok: true,
      message:
        "Votre offre est déposée. L'équipe DataParl' la relit (vérification de l'adresse parlementaire) avant publication, en général sous 24 h.",
    });
  } catch {
    return Response.json({ erreur: "dépôt impossible pour le moment" }, { status: 500 });
  }
}
