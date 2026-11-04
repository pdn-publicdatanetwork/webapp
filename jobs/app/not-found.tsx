"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Motif = { icone: string; titre: string; texte: string };

const MOTIFS: Motif[] = [
  { icone: "💰", titre: "Irrecevabilité financière (article 40)",
    texte: "Cette page créait une charge publique sans compensation appropriée. Le président de la commission des finances a opposé l'irrecevabilité." },
  { icone: "🐎", titre: "Cavalier législatif (article 45)",
    texte: "Cette URL ne présentait aucun lien, même indirect, avec le site encore en discussion. Elle a donc été écartée." },
  { icone: "⏳", titre: "Dépôt hors délai",
    texte: "Cette page a été demandée après la date et l'heure limites fixées par le règlement. Reprenez la navigation depuis l'accueil." },
  { icone: "🔻", titre: "Règle de l'entonnoir",
    texte: "À partir de la deuxième lecture, seules les offres encore en discussion sont accessibles. Le lien demandé n'en faisait plus partie." },
  { icone: "⚖️", titre: "Domaine réglementaire (article 41)",
    texte: "Le contenu de cette page relevait du domaine réglementaire et non du domaine de la loi. Le Gouvernement a opposé l'irrecevabilité." },
  { icone: "📋", titre: "Cavalier budgétaire (LOLF)",
    texte: "Cette page contenait une disposition étrangère au domaine des lois de finances. Elle n'a pas pu être inscrite à l'ordre du jour." },
  { icone: "🩺", titre: "Cavalier social (LOLFSS)",
    texte: "Cette page relevait du domaine exclusif des lois de financement de la sécurité sociale. Elle a été renvoyée dans une autre navette." },
  { icone: "👯", titre: "Amendement doublon",
    texte: "Cette page était identique à une autre, déjà adoptée ou rejetée. Le règlement interdit de la remettre en discussion." },
  { icone: "🧩", titre: "Sous-amendement irrecevable",
    texte: "Cette navigation contredisait le sens de l'amendement principal auquel elle se rattachait. Elle a été retirée avant la mise aux voix." },
  { icone: "📜", titre: "Ordonnances (article 38)",
    texte: "Cette page contredisait une habilitation donnée au Gouvernement pour légiférer par ordonnances. Elle a été déclarée irrecevable." },
  { icone: "🤝", titre: "Irrecevable en commission mixte paritaire",
    texte: "En CMP, seuls les amendements portant sur les dispositions restant en discussion sont recevables. Sauf accord du Gouvernement, cette page a été écartée." },
  { icone: "🌫️", titre: "Neutron législatif",
    texte: "Cette page était dépourvue de toute portée normative. Sans effet sur le droit existant, elle n'a pas été mise en discussion." },
  { icone: "✍️", titre: "Défaut de signature",
    texte: "Cette page n'était pas présentée dans les formes requises par le règlement. Son dépôt n'a pas pu être régularisé." },
  { icone: "🔀", titre: "Habilitation à ordonnancer",
    texte: "Cette page tendait à autoriser le Gouvernement à prendre des ordonnances, ce que le règlement n'admet pas dans ce contexte." },
];

const LIENS = [
  { icone: "🔍", titre: "Toutes les offres", texte: "Consultez les postes d'assistants et collaborateurs actifs.", href: "/jobs" },
  { icone: "👤", titre: "Mon compte", texte: "Accédez à vos candidatures et alertes e-mail.", href: "/mon-compte" },
  { icone: "🏛️", titre: "DataParl'", texte: "Retour sur la plateforme principale DataParl'.", href: "https://www.dataparl.fr" },
];

function melanger<T>(liste: T[]): T[] {
  return [...liste].sort(() => Math.random() - 0.5);
}

export default function Introuvable() {
  const [motifs, setMotifs] = useState<Motif[]>(MOTIFS.slice(0, 4));

  useEffect(() => {
    setMotifs(melanger(MOTIFS).slice(0, 4));
  }, []);

  return (
    <div className="max-w-4xl mx-auto text-center space-y-8 py-8">
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-lavande/40 border border-lavande text-brand text-xs font-semibold uppercase tracking-wider">
        <span>🏛️ Exception d&apos;irrecevabilité soulevée</span>
      </div>

      <div className="space-y-3">
        <h1 className="text-7xl sm:text-9xl font-serif-title font-extrabold text-brand tracking-tight">404</h1>
        <h2 className="text-2xl sm:text-4xl font-serif-title font-bold text-brand">
          Votre navigation a été déclarée irrecevable.
        </h2>
        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
          Après examen en commission, la page que vous demandez n&apos;a pas été retenue.
          Le motif exact n&apos;a pas été inscrit au procès-verbal, mais nos services
          vous proposent quelques pistes.
        </p>
      </div>

      <form action="/jobs" method="get" className="max-w-xl mx-auto bg-white p-2 sm:p-2.5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-2">
        <div className="pl-3 text-slate-400">🔍</div>
        <input
          type="text"
          name="q"
          placeholder="Chercher un poste (ex: Collaborateur, Stage, Sénat)..."
          className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
        />
        <button type="submit" className="bg-brand hover:bg-brand-hover text-white px-5 py-2.5 rounded-xl text-xs font-semibold shrink-0 transition-all">
          Rechercher
        </button>
      </form>

      <div className="text-left space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 text-center pt-2">
          Motifs d&apos;irrecevabilité possibles (article 40, cavaliers, entonnoir…)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {motifs.map((m) => (
            <div key={m.titre} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-ciel text-brand flex items-center justify-center shrink-0 text-lg">{m.icone}</div>
                <div>
                  <h4 className="font-serif-title font-bold text-brand text-sm">{m.titre}</h4>
                  <p className="text-xs text-slate-500 mt-1">{m.texte}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
        {LIENS.map((l) =>
          l.href.startsWith("/") ? (
            <Link key={l.titre} href={l.href} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-brand/40 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-ciel flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition-transform">{l.icone}</div>
              <h3 className="font-serif-title font-bold text-brand text-sm group-hover:text-bleu">{l.titre}</h3>
              <p className="text-xs text-slate-500 mt-1">{l.texte}</p>
            </Link>
          ) : (
            <a key={l.titre} href={l.href} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-brand/40 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-ciel flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition-transform">{l.icone}</div>
              <h3 className="font-serif-title font-bold text-brand text-sm group-hover:text-bleu">{l.titre}</h3>
              <p className="text-xs text-slate-500 mt-1">{l.texte}</p>
            </a>
          )
        )}
      </div>
    </div>
  );
}
