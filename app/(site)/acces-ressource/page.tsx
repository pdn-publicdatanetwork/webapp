import Link from "next/link";

// Page intermédiaire entre data.gouv.fr et la connexion : quand un visiteur
// clique sur un fichier CSV publié sur data.gouv (media.dataparl.fr/assets/…),
// il arrive ici avant la connexion. On lui explique pourquoi un compte est
// demandé et ce qu'il va se passer après. La ressource visée est dans ?suite=.
export const metadata = {
  title: "Ressource protégée, DataParl'",
  description: "Crée un compte DataParl' (gratuit) pour télécharger cette ressource.",
};

export default async function AccesRessource({ searchParams }: { searchParams: Promise<{ suite?: string }> }) {
  const suite = (await searchParams).suite ?? "";
  const fichier = decodeURIComponent(suite).split("/").pop() ?? "";
  const hrefConnexion = "/connexion" + (suite ? "?suite=" + encodeURIComponent(suite) : "");

  return (
    <div className="card" style={{ maxWidth: 640, margin: "40px auto" }}>
      <h1>Cette ressource demande un compte</h1>
      <p style={{ marginTop: 0 }}>
        {fichier ? <>Le fichier <strong>{fichier}</strong> est publié par DataParl&apos;.</> : <>Cette ressource est publiée par DataParl&apos;.</>}
        {" "}Le téléchargement est réservé aux comptes, gratuitement et en quelques secondes : une adresse email suffit, ou une connexion Google, GitHub ou X.
      </p>
      <ul style={{ margin: "12px 0" }}>
        <li>Ton fichier se télécharge automatiquement dès la connexion ;</li>
        <li>Tu arrives ensuite sur le tableur DataParl&apos; Sheets, avec toutes les autres listes téléchargeables ;</li>
        <li>Les données sont sous licence ODbL : tu peux les réutiliser librement.</li>
      </ul>
      <p className="meta">
        Déjà un compte ? Connecte-toi, le téléchargement repartira de lui-même.
      </p>
      <p style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <a className="btn" href={hrefConnexion}>Se connecter ou créer un compte</a>
        <Link className="btn secondaire" href="/">Découvrir DataParl&apos;</Link>
      </p>
    </div>
  );
}
