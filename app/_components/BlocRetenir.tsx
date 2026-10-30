// Bloc rétention : transformer une lecture ponctuelle en visite récurrente.
// Affiché aux moments de forte valeur (après un export CSV réussi, en fin des
// fiches populaires) : le renvoi vers /alertes (Daily/Weekly) est le levier
// n°1 de rétention du site : l'inscription aux alertes inscrit aussi à la
// newsletter (voir app/api/compte/alertes).
export default function BlocRetenir({ compact = false }: { compact?: boolean }) {
  return (
    <div className="card" style={{ maxWidth: "none", ...(compact ? { marginTop: 16 } : {}) }}>
      <p style={{ marginTop: 0, marginBottom: 6 }}>
        <strong>Ce qui bouge, directement dans votre boîte mail.</strong>
      </p>
      <p className="meta" style={{ marginTop: 0, marginBottom: 10 }}>
        Choisissez les élus, groupes ou chambres à suivre : DataParl&apos; vous écrit dès qu&apos;un collaborateur
        arrive ou part. Gratuit, sans pub, désinscription en un clic.
      </p>
      <a className="btn" href="/alertes">Créer mon alerte</a>
    </div>
  );
}
