// Contrôle anti-abus des adresses email (décision du 02/11/2026).
// La détection est partagée entre le client (refus immédiat à l'inscription,
// /connexion) et le cron serveur /api/cron/anti-abus (relance des comptes
// passés entre les mailles, mail d'avertissement, suspension après 7 jours).
// Aucun import server-only ici : ce module tourne aussi dans le navigateur.

const DOMAINES_JETABLES = new Set([
  "mailinator.com", "yopmail.com", "yopmail.net", "yopmail.fr", "guerrillamail.com",
  "10minutemail.com", "10minutemail.net", "temp-mail.org", "tempmail.com",
  "throwawaymail.com", "trashmail.com", "trashmail.net", "dispostable.com",
  "maildrop.cc", "getnada.com", "sharklasers.com", "mailnesia.com",
  "fakeinbox.com", "discard.email", "spambog.com", "mailcatch.com",
  "inboxbear.com", "moakt.com", "emailondeck.com", "burnermail.io", "jetable.org",
]);

// Motifs recherchés dans la partie locale de l'adresse. On évite les motifs
// trop courts (« temp », « test ») qui produiraient des faux positifs.
const MOTIFS = [
  "pourrie", "pourriel", "jetable", "temporaire", "tempmail", "temp-mail",
  "trashmail", "throwaway", "boitemail", "fake", "spam", "dummy", "discard",
];

export type Controle = { suspect: boolean; motif: string | null };

export function controleEmail(email: string): Controle {
  const e = email.trim().toLowerCase();
  const at = e.lastIndexOf("@");
  if (at <= 0) return { suspect: false, motif: null };
  const local = e.slice(0, at);
  const domaine = e.slice(at + 1);
  if (DOMAINES_JETABLES.has(domaine)) return { suspect: true, motif: `domaine jetable (${domaine})` };
  for (const m of MOTIFS) {
    if (local.includes(m)) return { suspect: true, motif: `motif « ${m} » dans l'adresse` };
  }
  return { suspect: false, motif: null };
}
