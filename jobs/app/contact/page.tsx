import { redirect } from "next/navigation";

// Le contact de Jobs est centralisé sur forms.dataparl.fr/contact (DataForm') :
// redirection en conservant les paramètres (?sujet=erreur&message=... depuis le
// signalement d'une annonce). DataForm lit ensuite la provenance via
// document.referrer pour pré-sélectionner le site d'origine.
export default async function Contact({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, v.slice(0, 5000));
  const suite = q.toString();
  redirect(suite ? "https://forms.dataparl.fr/contact?" + suite : "https://forms.dataparl.fr/contact");
}
