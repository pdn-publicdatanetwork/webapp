import "./_styles/jobs.css";

// Layout du module Jobs : importe les styles propres au module pour qu'ils
// s'appliquent à l'accueil comme aux pages de détail, sans alourdir
// globals.css (déjà volumineux).

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
