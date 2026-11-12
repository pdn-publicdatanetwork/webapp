"use client";

// DataParl' Chat : pop-up question-réponse, moteur hébergé dans le dépôt
// dataparl/dpchat (relais Mistral + outil dataparl_query sur l'API v1),
// servi sur https://chat.dataparl.fr.
// Accès : compte DataParl' requis (session dataparl-auth) + acceptation
// des CGU à chaque nouvelle visite. Historique en mémoire locale uniquement,
// vidé à la fermeture (aucun stockage serveur ni localStorage des échanges).
// Style : charte DataParl' via les variables CSS du site.

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { sessionActuelle } from "@/lib/supabaseBrowser";
import { cheminEspace } from "./useHoteMy";

const RELAIS = process.env.NEXT_PUBLIC_DPCHAT_URL ?? "https://chat.dataparl.fr/api/chat";
const CGU_URL = "/informations-legales/cgu-chat";

type Message = { role: "user" | "assistant"; content: string };

// Rendu markdown minimaliste : **gras**, *italique*, [liens](url),
// titres (##, ###), listes (- et 1.), tableaux |…|.
function Md({ texte }: { texte: string }) {
  const lignes = texte.split(/\n/);
  const blocs: React.ReactNode[] = [];
  let i = 0;
  let cle = 0;

  const enLigne = (s: string): React.ReactNode[] => {
    const parties = s.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g);
    return parties.map((p, j) => {
      if (p.startsWith("**") && p.endsWith("**")) return <strong key={j}>{p.slice(2, -2)}</strong>;
      if (p.startsWith("*") && p.endsWith("*") && p.length > 2) return <em key={j}>{p.slice(1, -1)}</em>;
      const lien = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (lien) return <a key={j} href={lien[2]}>{lien[1]}</a>;
      return <span key={j}>{p}</span>;
    });
  };

  while (i < lignes.length) {
    const l = lignes[i].trim();

    // Tableau : lignes |…|…| consécutives (la 2e ligne de séparateur est ignorée)
    if (l.startsWith("|") && l.endsWith("|") && l.length > 2) {
      const lignesTab: string[] = [];
      while (i < lignes.length && lignes[i].trim().startsWith("|")) {
        if (!/^\|[\s:|-]+\|$/.test(lignes[i].trim())) lignesTab.push(lignes[i].trim());
        i++;
      }
      const cellules = (r: string) => r.slice(1, -1).split("|").map((c) => c.trim());
      const entetes = lignesTab.length ? cellules(lignesTab[0]) : [];
      blocs.push(
        <div key={cle++} style={{ overflowX: "auto", margin: "6px 0" }}>
          <table style={{ borderCollapse: "collapse", fontSize: ".85rem", width: "100%" }}>
            <thead>
              <tr>{entetes.map((h, c) => (
                <th key={c} style={{ border: "1px solid var(--line)", background: "var(--bg)", padding: "5px 8px", textAlign: "left", fontWeight: 600 }}>{enLigne(h)}</th>
              ))}</tr>
            </thead>
            <tbody>
              {lignesTab.slice(1).map((r, ri) => (
                <tr key={ri}>{cellules(r).map((c, ci) => (
                  <td key={ci} style={{ border: "1px solid var(--line)", padding: "5px 8px" }}>{enLigne(c)}</td>
                ))}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Titres
    const titre = l.match(/^(#{2,4})\s+(.*)$/);
    if (titre) {
      blocs.push(<strong key={cle++} style={{ display: "block", margin: "8px 0 2px", fontSize: ".92rem" }}>{enLigne(titre[2])}</strong>);
      i++;
      continue;
    }

    // Listes
    if (/^[-*•]\s+/.test(l) || /^\d+\.\s+/.test(l)) {
      const items: string[] = [];
      while (i < lignes.length && (/^[-*•]\s+/.test(lignes[i].trim()) || /^\d+\.\s+/.test(lignes[i].trim()))) {
        items.push(lignes[i].trim().replace(/^([-*•]|\d+\.)\s+/, ""));
        i++;
      }
      blocs.push(
        <ul key={cle++} style={{ margin: "4px 0", paddingLeft: 18 }}>
          {items.map((it, k) => <li key={k} style={{ marginBottom: 2 }}>{enLigne(it)}</li>)}
        </ul>
      );
      continue;
    }

    // Paragraphe vide → séparateur
    if (!l) { i++; continue; }

    blocs.push(<p key={cle++} style={{ margin: "0 0 6px" }}>{enLigne(l)}</p>);
    i++;
  }
  return <>{blocs}</>;
}

export default function ChatWidget() {
  const chemin = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const [porte, setPorte] = useState<"verification" | "non-connecte" | "cgu" | "ouvert">("verification");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  // À l'ouverture : session requise, puis acceptation des CGU.
  async function ouvrir() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    setPorte("verification");
    const session = await sessionActuelle().catch(() => null);
    setPorte(session ? "cgu" : "non-connecte");
  }

  async function send() {
    const q = input.trim();
    if (!q || busy || porte !== "ouvert") return;
    setInput("");
    setBusy(true);
    const history = [...messages, { role: "user" as const, content: q }];
    setMessages(history);
    try {
      const res = await fetch(RELAIS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      setMessages([
        ...history,
        { role: "assistant", content: data.reply ?? "Désolé, une erreur est survenue. Réessayez plus tard." },
      ]);
    } catch {
      setMessages([
        ...history,
        { role: "assistant", content: "Connexion impossible. Réessayez plus tard." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function accepterCgu() {
    setMessages([
      { role: "assistant", content: "Bonjour ! Posez-moi une question sur DataParl' ou les données parlementaires." },
    ]);
    setPorte("ouvert");
  }

  const ouvert = open && porte === "ouvert";

  // La capsule my.dataparl.fr est un outil privé : pas de chat flottant sur
  // ses pages (vue d'ensemble, compte, espace API).
  if (cheminEspace(chemin)) return null;

  return (
    <>
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: "72px",
            right: "16px",
            width: "min(380px, calc(100vw - 32px))",
            height: "min(520px, 72vh)",
            borderRadius: "var(--radius-card)",
            border: "1px solid var(--line)",
            background: "var(--card)",
            color: "var(--ink)",
            boxShadow: "0 10px 30px rgba(7, 26, 65, .18)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 70,
            fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--line)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span style={{ fontFamily: "var(--font-spectral), 'Spectral', Georgia, serif", fontWeight: 700, fontSize: "1.05rem" }}>
              DataParl' Chat
            </span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Fermer le chat"
              style={{ all: "unset", cursor: "pointer", color: "var(--muted)", fontSize: "1.15rem", lineHeight: 1, padding: "2px 6px" }}
            >
              ×
            </button>
          </div>

          {porte === "verification" && (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: ".9rem" }}>…</div>
          )}

          {porte === "non-connecte" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24, textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: ".93rem", lineHeight: 1.5 }}>
                Le Chat DataParl&apos; est réservé aux utilisateurs connectés.
                Créez un compte gratuit ou connectez-vous pour l&apos;utiliser.
              </p>
              <a
                href="/mon-compte"
                style={{ background: "var(--corail)", color: "var(--sur-corail)", padding: "8px 18px", borderRadius: 6, fontWeight: 600, fontSize: ".9rem", textDecoration: "none" }}
              >
                Se connecter
              </a>
            </div>
          )}

          {porte === "cgu" && (
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, padding: 16, fontSize: ".93rem", lineHeight: 1.5 }}>
              <p style={{ margin: 0 }}>
                Le Chat DataParl&apos; est un assistant automatisé : ses réponses,
                générées par IA, peuvent contenir des erreurs et ne constituent
                pas une source officielle.
              </p>
              <p style={{ margin: 0 }}>
                Vos questions sont transmises à Mistral AI (UE) pour générer les
                réponses ; les échanges restent en mémoire locale, vidés à la
                fermeture. Les questions sont journalisées (statistiques et
                qualité), sans identification, cf. CGU.
              </p>
              <p style={{ margin: 0 }}>
                Pour utiliser le Chat, acceptez les{" "}
                <a href={CGU_URL} target="_blank" rel="noopener noreferrer">CGU DataParl&apos; Chat</a>.
              </p>
              <button
                onClick={accepterCgu}
                style={{ all: "unset", cursor: "pointer", background: "var(--corail)", color: "var(--sur-corail)", padding: "9px 18px", borderRadius: 6, fontWeight: 600, fontSize: ".9rem", textAlign: "center" }}
              >
                J&apos;accepte les CGU
              </button>
            </div>
          )}

          {ouvert && (
            <>
              <div style={{ flex: 1, overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: "10px", fontSize: ".93rem", lineHeight: 1.5 }}>
                {messages.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                      background: m.role === "user" ? "var(--ink)" : "var(--bg)",
                      color: m.role === "user" ? "var(--bg)" : "var(--ink)",
                      border: m.role === "user" ? "1px solid var(--ink)" : "1px solid var(--line)",
                      padding: m.role === "user" ? "8px 12px" : "10px 12px",
                      borderRadius: "10px",
                      maxWidth: "95%",
                      whiteSpace: "normal",
                    }}
                  >
                    <Md texte={m.content} />
                  </div>
                ))}
                {busy && (
                  <div style={{ alignSelf: "flex-start", background: "var(--bg)", border: "1px solid var(--line)", color: "var(--muted)", padding: "8px 12px", borderRadius: "10px" }}>
                    …
                  </div>
                )}
                <div ref={endRef} />
              </div>
              <div style={{ display: "flex", borderTop: "1px solid var(--line)" }}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="Votre question…"
                  style={{
                    flex: 1,
                    border: "none",
                    padding: "12px 14px",
                    fontSize: ".93rem",
                    outline: "none",
                    background: "transparent",
                    color: "var(--ink)",
                    fontFamily: "inherit",
                  }}
                />
                <button
                  onClick={send}
                  disabled={busy}
                  style={{
                    all: "unset",
                    cursor: busy ? "default" : "pointer",
                    background: "var(--corail)",
                    color: "var(--sur-corail)",
                    padding: "0 18px",
                    display: "inline-flex",
                    alignItems: "center",
                    fontWeight: 600,
                    fontSize: ".9rem",
                    opacity: busy ? 0.6 : 1,
                  }}
                >
                  Envoyer
                </button>
              </div>
            </>
          )}
        </div>
      )}
      <button
        onClick={ouvrir}
        aria-label={open ? "Fermer le chat" : "Ouvrir le chat"}
        style={{
          position: "fixed",
          right: "16px",
          bottom: "16px",
          width: 48,
          height: 48,
          borderRadius: "50%",
          border: "1px solid var(--line)",
          background: "var(--card)",
          cursor: "pointer",
          fontSize: "1.15rem",
          lineHeight: 1,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 14px rgba(7, 26, 65, .18)",
          zIndex: 70,
        }}
      >
        {open ? "×" : "💬"}
      </button>
    </>
  );
}
