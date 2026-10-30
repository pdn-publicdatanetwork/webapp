"use client";

import { useEffect, useMemo, useState } from "react";
import { prenomNom } from "@/lib/format";
import { LIBELLE_FONCTION, LIBELLE_STATUT, categorieFonction, enPoste, finEffective, normaliseNom, periode, slugGouvernement, statutCabinet, type MandatMinistre, type MembreCabinet } from "@/lib/gouvernementTypes";

const hrefM = (id: string) => "/gouv/m/" + encodeURIComponent(id);
// L'état des filtres vit dans l'URL (deep linking) : un lien partagé rouvre la même vue.
const param = (cle: string) => {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(cle) ?? "";
};

// Explorateur des gouvernements : recherche transversale par nom (ministre ou
// membre de cabinet), filtres par fonction, gouvernement et statut. Sans
// filtre, la chronologie repliable par gouvernement reste affichée.
export default function ExplorateurGouvernement({ mandats, cabinets, slugCollab }: { mandats: MandatMinistre[]; cabinets: MembreCabinet[]; slugCollab: Record<string, string> }) {
  const [q, setQ] = useState(() => param("q"));
  const [catBrut, setCat] = useState(() => param("fonction"));
  const [gouvBrut, setGouv] = useState(() => param("gouvernement"));
  const [statutBrut, setStatut] = useState(() => param("statut"));

  const mandatParId = useMemo(() => new Map(mandats.map((m) => [m.id, m])), [mandats]);
  const cabinetsParMinistre = useMemo(() => {
    const m = new Map<string, MembreCabinet[]>();
    for (const c of cabinets) {
      const l = m.get(c.ministre_id) ?? [];
      l.push(c);
      m.set(c.ministre_id, l);
    }
    return m;
  }, [cabinets]);

  const gouvernements = useMemo(() => {
    const debut = new Map<string, string>();
    for (const m of mandats) {
      const g = m.gouvernement || "Autres mandats";
      if (!debut.has(g) || m.debut > debut.get(g)!) debut.set(g, m.debut);
    }
    return [...debut.keys()].sort((a, b) => debut.get(b)!.localeCompare(debut.get(a)!));
  }, [mandats]);

  // Un membre rapproché à un collaborateur parlementaire pointe vers sa fiche
  // unique /collab/<slug> ; les autres vers la fiche de cabinet (anti-doublons).
  const hrefC = (c: MembreCabinet) =>
    c.collab_id && slugCollab[c.collab_id]
      ? "/collab/" + encodeURIComponent(slugCollab[c.collab_id])
      : "/gouv/c/" + encodeURIComponent(c.collab_cle);

  // Valeurs d'URL invalides ignorées proprement.
  const cat = catBrut in LIBELLE_FONCTION ? catBrut : "";
  const statut = statutBrut === "en-poste" || statutBrut === "anciens" ? statutBrut : "";
  const gouv = gouvernements.includes(gouvBrut) ? gouvBrut : "";

  useEffect(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (cat) p.set("fonction", cat);
    if (gouv) p.set("gouvernement", gouv);
    if (statut) p.set("statut", statut);
    const s = p.toString();
    window.history.replaceState(null, "", s ? "/gouv/explorer?" + s : "/gouv/explorer");
  }, [q, cat, gouv, statut]);

  const jetons = normaliseNom(q).split(" ").filter(Boolean).slice(0, 6);
  const cherche = jetons.length > 0;
  const filtre = cherche || cat !== "" || statut !== "" || gouv !== "";

  const ministresTrouves = filtre
    ? mandats.filter((m) => {
        if (gouv && (m.gouvernement || "Autres mandats") !== gouv) return false;
        if (statut === "en-poste" && m.fin) return false;
        if (statut === "anciens" && !m.fin) return false;
        if (!cherche) return true;
        const sable = normaliseNom([m.prenom, m.nom, m.portefeuille, m.fonction, m.gouvernement].join(" "));
        const sableJoint = sable.replace(/ /g, "");
        return jetons.every((j) => sable.includes(j) || sableJoint.includes(j.replace(/ /g, "")));
      }).sort((a, b) => a.nom.localeCompare(b.nom, "fr"))
    : [];

  const cabinetsTrouves = filtre
    ? cabinets.filter((c) => {
        if (cat && categorieFonction(c.fonction) !== cat) return false;
        const m = mandatParId.get(c.ministre_id);
        if (gouv && (!m || (m.gouvernement || "Autres mandats") !== gouv)) return false;
        if (statut === "en-poste" && !enPoste(c.fin, m?.fin ?? null)) return false;
        if (statut === "anciens" && enPoste(c.fin, m?.fin ?? null)) return false;
        if (!cherche) return true;
        const sable = normaliseNom([c.collab_prenom, c.collab_nom, c.fonction, m?.prenom, m?.nom, m?.portefeuille, m?.gouvernement].join(" "));
        const sableJoint = sable.replace(/ /g, "");
        return jetons.every((j) => sable.includes(j) || sableJoint.includes(j.replace(/ /g, "")));
      }).sort((a, b) => a.collab_nom.localeCompare(b.collab_nom, "fr"))
    : [];

  const aucun = filtre && ministresTrouves.length === 0 && cabinetsTrouves.length === 0;

  return (
    <>
      <div>
        <label htmlFor="gouv-q">
          <strong>Rechercher un ministre ou un membre de cabinet</strong>{" "}
          <span className="meta">(nom, fonction, portefeuille, gouvernement, insensible aux accents)</span>
        </label>
        <input
          id="gouv-q" type="search" value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ex. : Darmanin, directeur de cabinet, Intérieur, Bayrou…"
          style={{ width: "min(100%, 480px)", fontSize: "1em", padding: "8px 10px", display: "block", marginTop: 6 }}
        />
        <p style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <label>
            Fonction{" "}
            <select value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="">Toutes</option>
              {Object.entries(LIBELLE_FONCTION).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
          <label>
            Gouvernement{" "}
            <select value={gouv} onChange={(e) => setGouv(e.target.value)}>
              <option value="">Tous</option>
              {gouvernements.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </label>
          <label>
            Statut{" "}
            <select value={statut} onChange={(e) => setStatut(e.target.value)}>
              <option value="">Tous</option>
              <option value="en-poste">En poste</option>
              <option value="anciens">Anciens</option>
            </select>
          </label>
          {filtre && (
            <button type="button" onClick={() => { setQ(""); setCat(""); setStatut(""); setGouv(""); }}>
              Réinitialiser
            </button>
          )}
        </p>
        <p className="meta">L&apos;URL reflète vos filtres : copiez-la pour partager exactement cette vue.</p>
      </div>

      {filtre ? (
        <>
          <h2>Résultats</h2>
          {aucun && (
            <p className="meta">
              Aucun résultat. Essayez un nom de famille seul, ou vérifiez l&apos;orthographe : les nominations sont publiées au JORF
              sous le nom exact de la personne.
            </p>
          )}
          {ministresTrouves.length > 0 && (
            <>
              <h3>Ministres ({ministresTrouves.length})</h3>
              <ul className="gouvernement">
                {ministresTrouves.slice(0, 200).map((m) => (
                  <li key={m.id}>
                    <a href={hrefM(m.id)}>{prenomNom(m.prenom, m.nom)}</a>{" "}
                    <span className="meta">{", " + (m.portefeuille || m.fonction) + ", " + m.gouvernement + ", " + periode(m.debut, m.fin)}</span>
                  </li>
                ))}
              </ul>
              {ministresTrouves.length > 200 && <p className="meta">{ministresTrouves.length + " ministres trouvés, 200 affichés, affinez la recherche."}</p>}
            </>
          )}
          {cabinetsTrouves.length > 0 && (
            <>
              <h3>Membres de cabinets ({cabinetsTrouves.length})</h3>
              <ul className="gouvernement">
                {cabinetsTrouves.slice(0, 300).map((c) => {
                  const m = mandatParId.get(c.ministre_id);
                  return (
                    <li key={c.id}>
                      <a href={hrefC(c)}>{prenomNom(c.collab_prenom, c.collab_nom)}</a>{" "}
                      <span className="meta">
                        {", " + c.fonction + ", cabinet de " + (m ? prenomNom(m.prenom, m.nom) : "ministre inconnu")}
                        {m?.portefeuille ? " (" + m.portefeuille + ")" : ""}{", " + periode(c.debut, finEffective(c.fin, m?.fin ?? null))}
                        {c.collab_id ? ", aussi collaborateur parlementaire" : ""}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {cabinetsTrouves.length > 300 && <p className="meta">{cabinetsTrouves.length + " membres trouvés, 300 affichés, affinez la recherche."}</p>}
            </>
          )}
        </>
      ) : (
        <>
          <p className="meta">
            Ouvrez un gouvernement pour voir ses ministres, puis le cabinet de chacun. Chaque gouvernement a aussi{" "}
            <a href="/gouv">sa page dédiée</a> (trombinoscope, ordre protocolaire). Chaque nom ouvre une fiche.
          </p>
          {gouvernements.map((g, i) => {
            const duGouvernement = mandats
              .filter((m) => (m.gouvernement || "Autres mandats") === g)
              .sort((a, b) => a.debut.localeCompare(b.debut));
            const membres = duGouvernement.reduce((n, m) => n + (cabinetsParMinistre.get(m.id)?.length ?? 0), 0);
            const nonDocumentes = duGouvernement.filter((m) => (cabinetsParMinistre.get(m.id)?.length ?? 0) === 0).length;
            return (
              <details key={g} open={i === 0}>
                <summary>
                  <h2 style={{ display: "inline" }}>
                    {g !== "Autres mandats" ? (
                      <a href={"/gouv/" + slugGouvernement(g)} style={{ color: "inherit" }}>{g}</a>
                    ) : g}
                  </h2>{" "}
                  <span className="meta">
                    {", " + duGouvernement.length + " ministre" + (duGouvernement.length > 1 ? "s" : "") + ", " + membres + " membre" + (membres > 1 ? "s" : "") + " identifié" + (membres > 1 ? "s" : "")}
                    {nonDocumentes > 0 ? ", " + nonDocumentes + " cabinet" + (nonDocumentes > 1 ? "s" : "") + " sans publication identifiée" : ""}
                  </span>
                </summary>
                <ul className="gouvernement">
                  {duGouvernement.map((m) => {
                    const equipe = cabinetsParMinistre.get(m.id) ?? [];
                    const st = statutCabinet(m.debut, equipe.length);
                    return (
                      <li key={m.id}>
                        <h3>
                          <a href={hrefM(m.id)}>{prenomNom(m.prenom, m.nom)}</a>
                          <span className="meta">{", " + (m.portefeuille || m.fonction) + ", " + periode(m.debut, m.fin) + ", " + LIBELLE_STATUT[st]}</span>
                        </h3>
                        {st === "documente" ? (
                          <ul>
                            {equipe.map((c) => (
                              <li key={c.id}>
                                <a href={hrefC(c)}>{prenomNom(c.collab_prenom, c.collab_nom)}</a>{" "}
                                <span className="meta">{", " + c.fonction + ", " + periode(c.debut, finEffective(c.fin, m.fin))}{c.collab_id ? ", aussi collaborateur parlementaire" : ""}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="meta">
                            {st === "verification"
                              ? "Mandat récent, recensement en cours : aucune nomination identifiée à ce jour au JORF (les décrets paraissent au fil de l'eau)."
                              : "Publication non retrouvée au JORF pour ce mandat : cabinet non documenté ici, pas nécessairement inexistant."}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </details>
            );
          })}
        </>
      )}
    </>
  );
}
