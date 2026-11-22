import { test } from "node:test";
import assert from "node:assert/strict";
import { signatureHtml, signatureTexte } from "./signature.ts";
import { profilWebClip } from "./mobileconfig.ts";
import { adresseValide } from "./motDePasse.ts";

test("signature : nom, poste, logo cliquable, échappement", () => {
  const h = signatureHtml({ prenom: "Marie", nom: "<Dupont>", poste: "Éditrice", email: "marie@dataparl.fr" });
  assert.match(h, /Marie &lt;Dupont&gt;/);
  assert.match(h, /Éditrice · DataParl'/);
  assert.match(h, /<a href="https:\/\/www\.dataparl\.fr"[^>]*><span[^>]*>Data/);
  assert.match(h, /mailto:marie@dataparl\.fr/);
  assert.match(signatureTexte({ prenom: "", nom: "", poste: "", email: "x@dataparl.fr" }), /^x@dataparl\.fr\nDataParl'/);
});

test("profil .mobileconfig (Web Clip)", () => {
  let n = 0;
  const p = profilWebClip({ email: "equipe@dataparl.fr", url: "https://webmail.dataparl.fr/", iconeBase64: "QUJD", uuid: () => `UUID-${++n}` });
  assert.match(p, /<string>com\.apple\.webClip\.managed<\/string>/);
  assert.match(p, /<key>URL<\/key><string>https:\/\/webmail\.dataparl\.fr\/<\/string>/);
  assert.match(p, /<data>QUJD<\/data>/);
  assert.match(p, /fr\.dataparl\.messagerie\.equipe-dataparl-fr/);
  assert.match(p, /DataParl&apos; Mail/);
  assert.notEqual(p.indexOf("UUID-1"), -1);
  assert.notEqual(p.indexOf("UUID-2"), -1);
});

test("adresse d'équipe saisie", () => {
  assert.equal(adresseValide("X@dataparl.fr"), "x@dataparl.fr");
  assert.equal(adresseValide("x@presse.dataparl.fr"), "x@presse.dataparl.fr");
  assert.equal(adresseValide("x@gmail.com"), null);
  assert.equal(adresseValide("x@a.b.dataparl.fr"), null);
});
