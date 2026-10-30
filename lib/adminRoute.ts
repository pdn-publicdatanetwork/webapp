import "server-only";
import { NextResponse } from "next/server";
import { checkAdmin, refus, type Admin, type Role } from "./adminAuth";
import type { Module } from "./permissions";

// Enveloppe commune des routes d'admin et de webmail : les trois verrous,
// le rôle requis (admin par défaut), puis réponse JSON jamais mise en cache.
export const EQUIPE: Role[] = ["admin", "editeur", "utilisateur"];
export const EDITION: Role[] = ["admin", "editeur"];

// `acces` : liste de rôles, ou module de la matrice de permissions.
export async function avecAdmin(req: Request, fn: (a: Admin) => Promise<unknown>, acces: Role[] | Module = ["admin"]): Promise<NextResponse> {
  const a = await checkAdmin(req);
  if (!a.ok) return refus(a);
  if (typeof acces === "string" ? !a.modules.includes(acces) : !acces.includes(a.role)) return NextResponse.json({ error: "réservé à un autre rôle" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  if (a.doitChangerMdp) return NextResponse.json({ error: "mot de passe à changer", mdp: true }, { status: 403, headers: { "Cache-Control": "no-store" } });
  try {
    const out = await fn(a);
    if (out instanceof NextResponse) {
      out.headers.set("Cache-Control", "no-store");
      return out;
    }
    return NextResponse.json(out ?? { ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("admin", e);
    // Une variable d'environnement manquante ne doit pas se cacher derrière un
    // « erreur serveur » générique : l'admin a besoin du nom pour la corriger.
    // Idem pour toute autre erreur : les routes sont réservées à l'équipe
    // connectée, le message exact (Supabase compris) aide au diagnostic.
    const brut = e instanceof Error ? e.message.trim() : "";
    const message = brut.startsWith("Variable d'environnement manquante")
      ? `${brut} : à ajouter dans les variables du projet sur Vercel`
      : brut ? `erreur serveur : ${brut.slice(0, 300)}` : "erreur serveur";
    return NextResponse.json({ error: message }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

export const erreur = (status: number, error: string) => NextResponse.json({ error }, { status });

export async function corps(req: Request): Promise<unknown> {
  return req.json().catch(() => null);
}
