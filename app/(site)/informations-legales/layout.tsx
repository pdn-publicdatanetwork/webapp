import type { Metadata } from "next";

// Pages légales utiles mais sans intérêt pour la recherche : hors index.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="legal etroit">
      <p className="meta"><a href="/informations-legales">Centre légal</a></p>
      {children}
    </div>
  );
}
