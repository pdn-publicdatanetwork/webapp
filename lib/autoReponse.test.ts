import { test } from "node:test";
import assert from "node:assert/strict";
import { doitRepondre, entetes, estScam } from "./autoReponse.ts";

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
  assert.equal(estScam("facture@promo.coint.trade"), true);
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
  assert.equal(doitRepondre({ ...base, from: "Théo <theo@dataparl.fr>" }), false);
});
