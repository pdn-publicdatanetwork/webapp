import { test } from "node:test";
import assert from "node:assert/strict";
import { ecartGenre, libelleMajorite, mixite, mixiteMoyenne, ptsEcartGenre, tauxMixite } from "./mixite.ts";

test("parité, non-mixité, exclusions", () => {
  const r = mixite([
    { femmes: 3, hommes: 2, indetermines: 0 }, // 60 % : parité
    { femmes: 4, hommes: 4, indetermines: 0 }, // parité
    { femmes: 3, hommes: 0, indetermines: 0 }, // non mixte
    { femmes: 1, hommes: 0, indetermines: 0 }, // 1 personne : hors périmètre
    { femmes: 2, hommes: 1, indetermines: 1 }, // genre indéterminé : exclue
    { femmes: 1, hommes: 3, indetermines: 0 }, // 25 % : ni l'un ni l'autre
  ]);
  assert.deepEqual(r, { eligibles: 4, exclues: 1, paritaires: 2, nonMixtes: 1 });
});

test("taux de mixité", () => {
  const proche = (a: number | null, b: number) => assert.ok(a !== null && Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);
  proche(tauxMixite({ femmes: 5, hommes: 5 }), 1);
  proche(tauxMixite({ femmes: 7, hommes: 3 }), 0.6);
  proche(tauxMixite({ femmes: 3, hommes: 7 }), 0.6);
  proche(tauxMixite({ femmes: 4, hommes: 0 }), 0);
  assert.equal(tauxMixite({ femmes: 0, hommes: 0 }), null);
  const m = mixiteMoyenne([
    { femmes: 1, hommes: 1, indetermines: 0 }, { femmes: 2, hommes: 0, indetermines: 0 },
    { femmes: 1, hommes: 0, indetermines: 0 }, { femmes: 1, hommes: 1, indetermines: 1 },
  ]);
  assert.equal(m.equipes, 2);
  proche(m.taux, 0.5);
});

test("écart de genre, points et libellés", () => {
  const proche = (a: number | null, b: number) => assert.ok(a !== null && Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);
  proche(ecartGenre({ femmes: 5, hommes: 5 }), 0);
  proche(ecartGenre({ femmes: 2, hommes: 1 }), 1 / 3);
  proche(ecartGenre({ femmes: 1, hommes: 2 }), -1 / 3);
  proche(ecartGenre({ femmes: 4, hommes: 0 }), 1);
  assert.equal(ecartGenre({ femmes: 0, hommes: 0 }), null);
  assert.equal(ptsEcartGenre(ecartGenre({ femmes: 2, hommes: 1 })), "+33,3 pts");
  assert.equal(ptsEcartGenre(ecartGenre({ femmes: 1, hommes: 2 })), "−33,3 pts");
  assert.equal(ptsEcartGenre(ecartGenre({ femmes: 1, hommes: 3 })), "−50 pts");
  assert.equal(ptsEcartGenre(ecartGenre({ femmes: 2, hommes: 2 })), "0 pt");
  assert.equal(ptsEcartGenre(null), "–");
  assert.equal(libelleMajorite({ femmes: 2, hommes: 2 }), "parité");
  assert.equal(libelleMajorite({ femmes: 2, hommes: 1 }), "majorité féminine");
  assert.equal(libelleMajorite({ femmes: 1, hommes: 2 }), "majorité masculine");
  assert.equal(libelleMajorite({ femmes: 3, hommes: 0 }), "équipe entièrement féminine");
  assert.equal(libelleMajorite({ femmes: 0, hommes: 3 }), "équipe entièrement masculine");
  assert.equal(libelleMajorite({ femmes: 0, hommes: 0 }), null);
});
