import { test } from "node:test";
import assert from "node:assert/strict";
import { doitRepondre, entetes, estRapportDmarc, estScam } from "./autoReponse.ts";

const base = { from: "Jeanne <jeanne@exemple.fr>", subject: "Question sur l'API", headers: {} };

test("liste blanche : réponse auto pour les personnes identifiées uniquement", () => {
  assert.equal(doitRepondre({ ...base, from: "dmitri.pozniak@sinch.com" }), true);
  assert.equal(doitRepondre({ ...base, from: "Constant <constant.jeanson@clb-an.fr>" }), true);
});

test("règle par défaut : silence pour tout inconnu, même un premier message", () => {
  assert.equal(doitRepondre(base), false);
});

test("scams confirmés : jamais de réponse", () => {
  assert.equal(doitRepondre({ ...base, from: "edp@coinn.trade" }), false);
  assert.equal(doitRepondre({ ...base, from: "debicamil@gmail.com" }), false);
  assert.equal(estScam("facture@promo.coinn.trade"), true);
});

test("machines observées dans le balayage du 14/11/2026 : silence", () => {
  assert.equal(doitRepondre({ ...base, from: "sc-noreply@google.com" }), false);
  assert.equal(doitRepondre({ ...base, from: "adsense-noreply@google.com" }), false);
  assert.equal(doitRepondre({ ...base, from: "dmarcreport@microsoft.com" }), false);
  assert.equal(doitRepondre({ ...base, from: "mailer-daemon@googlemail.com" }), false);
  assert.equal(doitRepondre({ ...base, from: "info@applixir.co" }), false);
  assert.equal(doitRepondre({ ...base, from: "lettredesmetierspolitiques@substack.com" }), false);
  assert.equal(doitRepondre({ ...base, from: "inforientation@cnil.fr" }), false);
});

test("adresses et en-têtes : clés en minuscules, nos propres adresses en silence", () => {
  assert.deepEqual(entetes({ "In-Reply-To": "<x>" }), { "in-reply-to": "<x>" });
  assert.deepEqual(entetes([{ name: "List-Id", value: "l" }]), { "list-id": "l" });
  assert.equal(doitRepondre({ ...base, from: "Équipe DataParl' <equipe@dataparl.fr>" }), false);
});

test("rapports DMARC agrégés : détectés, quel que soit le fournisseur", () => {
  // Reçus réels sur hello@dataparl.fr (expéditeurs et objets observés).
  assert.equal(estRapportDmarc({ from: "dmarcreport@microsoft.com", subject: "[Preview] Report Domain: dataparl.fr Submitter: enterprise.protection.outlook.com Report-ID: aa0f", headers: {} }), true);
  assert.equal(estRapportDmarc({ from: "noreply-dmarc-support@google.com", subject: "Report domain: dataparl.fr Submitter: google.com Report-ID: 123", headers: {} }), true);
  assert.equal(estRapportDmarc({ from: "noreply@dmarc.yahoo.com", subject: "Report Domain: dataparl.fr Submitter: yahoo.fr Report-ID: <1795>", headers: {} }), true);
  assert.equal(estRapportDmarc({ from: "dmarc-reporting@laposte.net", subject: "Report Domain: dataparl.fr Submitter: laposte.net Report-ID: 2026", headers: {} }), true);
});

test("un vrai message n'est jamais pris pour un rapport DMARC", () => {
  assert.equal(estRapportDmarc(base), false);
  assert.equal(estRapportDmarc({ ...base, subject: "Rapport d'activité parlementaire" }), false);
  assert.equal(estRapportDmarc({ ...base, from: "jeanne@clb-an.fr" }), false);
});
