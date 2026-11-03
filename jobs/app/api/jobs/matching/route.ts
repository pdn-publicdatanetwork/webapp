export const dynamic = "force-dynamic";

// Analyse IA du CV contre les offres (Mistral small, JSON strict).
// Repli : le client garde son score heuristique local si cette route
// renvoie une erreur (clé absente, IA indisponible).

const texte = (x: unknown, max: number) => (typeof x === "string" ? x.trim().slice(0, max) : "");

export async function POST(req: Request) {
  const cle = (process.env.MISTRAL_API_KEY || "").trim();
  if (!cle) return Response.json({ erreur: "analyse IA non configurée" }, { status: 503 });

  const c = (await req.json().catch(() => null)) ?? {};
  const cv = texte(c.cv, 6000);
  const offresBrutes = Array.isArray(c.offres)
    ? c.offres
        .filter((o: unknown): o is Record<string, unknown> => Boolean(o) && typeof (o as Record<string, unknown>)?.id === "string" && typeof (o as Record<string, unknown>)?.titre === "string")
        .slice(0, 20)
    : [];
  if (cv.length < 40 || offresBrutes.length === 0) {
    return Response.json({ erreur: "requête invalide" }, { status: 400 });
  }

  const offres = offresBrutes.map((o) => ({ id: String(o.id), titre: texte(o.titre, 120), extrait: texte(o.extrait, 800) }));

  const prompt =
    "Tu es un assistant de recrutement pour des postes de collaborateur parlementaire en France (Assemblée nationale, Sénat, Parlement européen).\n\n" +
    "CV du candidat :\n" +
    cv +
    "\n\nOffres à évaluer (id, titre, extrait) :\n" +
    JSON.stringify(offres) +
    '\n\nRends UNIQUEMENT un objet JSON valable, sans texte autour, exactement au format :\n{"competences": ["..."], "correspondances": [{"id": "<id de l offre>", "score": <entier 0 a 100>, "points_forts": ["..."], "manques": ["..."], "conseil": "<une phrase>"}]}\n' +
    "Regles : une entree par offre, competences = 3 a 10 competences cles du candidat (libelles courts), score honnete et discriminant (pas tous eleves), points_forts et manques de 1 a 3 elements courts (80 caracteres max), conseil une seule phrase utile pour le candidat, aucun tiret long ni point median, reponse en francais.";

  try {
    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + cle },
      body: JSON.stringify({
        model: "mistral-small-latest",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return Response.json({ erreur: "analyse IA indisponible" }, { status: 502 });
    const j = await res.json().catch(() => null);
    const contenu = typeof j?.choices?.[0]?.message?.content === "string" ? j.choices[0].message.content : "";
    const parse = JSON.parse(contenu) as Record<string, unknown>;
    const competences = Array.isArray(parse.competences)
      ? parse.competences.filter((x): x is string => typeof x === "string").slice(0, 10)
      : [];
    const correspondances = Array.isArray(parse.correspondances)
      ? parse.correspondances
          .filter((x): x is Record<string, unknown> => Boolean(x) && typeof (x as Record<string, unknown>)?.id === "string")
          .map((x) => ({
            id: String(x.id),
            score: Math.max(0, Math.min(100, Math.round(Number(x.score) || 0))),
            points_forts: Array.isArray(x.points_forts) ? x.points_forts.filter((p): p is string => typeof p === "string").slice(0, 3) : [],
            manques: Array.isArray(x.manques) ? x.manques.filter((p): p is string => typeof p === "string").slice(0, 3) : [],
            conseil: typeof x.conseil === "string" ? x.conseil.slice(0, 200) : "",
          }))
      : [];
    if (correspondances.length === 0) return Response.json({ erreur: "réponse IA inexploitable" }, { status: 502 });
    return Response.json({ competences, correspondances });
  } catch {
    return Response.json({ erreur: "analyse IA indisponible" }, { status: 502 });
  }
}
