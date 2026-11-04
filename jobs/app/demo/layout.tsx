import type { Metadata } from "next";

// Pages de démonstration : jamais indexées par les moteurs de recherche.

export const metadata: Metadata = {
  title: "Démonstration",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
