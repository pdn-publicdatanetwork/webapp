"use client";
import { useState } from "react";

// Logo d'un groupe sur une carte : image servie par media.dataparl.fr
// (logos Datan pour l'Assemblée nationale, logos Sénat / Parlement européen
// téléversés sur le media), avec repli en pastille colorée sigle si le
// fichier n'existe pas encore ou ne charge pas. Le CSS (object-fit:
// contain) garantit que le logo n'est jamais rogné dans son carré.

export default function LogoGroupe({ sigle, logo, couleur }: { sigle: string; logo: string | null; couleur: string }) {
  const [charge, setCharge] = useState(!!logo);
  if (logo && charge) {
    return (
      <img
        className="groupe-carte-logo"
        src={logo}
        alt=""
        width={42}
        height={42}
        loading="lazy"
        onError={() => setCharge(false)}
      />
    );
  }
  return <span className="groupe-pastille" style={{ ["--c" as string]: couleur }}>{sigle}</span>;
}
