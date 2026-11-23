import { test } from "node:test";
import assert from "node:assert/strict";
import { groupesDuMandat, siglesSuccessifs } from "./periodes.ts";

const g = (sigle: string, debut: string, fin: string, chambre = "assemblee") =>
  ({ chambre, elu_id: "E1", type: "groupe", sigle, libelle: sigle, debut, fin });
const mandat = { chambre: "assemblee", elu_id: "E1", debut: "2024-07-07", fin: "" };

test("groupes du mandat : chevauchement et ordre chronologique", () => {
  const res = groupesDuMandat([g("SOC", "2024-07-19", ""), g("NI", "2024-07-08", "2024-07-18")], mandat);
  assert.deepEqual(res.map((x) => x.sigle), ["NI", "SOC"]);
  // Une appartenance close avant le mandat n'apparaît pas.
  assert.equal(groupesDuMandat([g("SRC", "2010-01-01", "2015-01-01")], mandat).length, 0);
  // Autre chambre ignorée, autre élu ignoré.
  assert.equal(groupesDuMandat([g("LR", "2024-07-19", "", "senat")], mandat).length, 0);
  assert.equal(groupesDuMandat([g("SOC", "2024-07-19", "")], { ...mandat, elu_id: "E2" }).length, 0);
});

test("artefact de renouvellement : la non-inscription brève disparaît", () => {
  // Cas réel de la 17e législature : NI de 10 jours en juillet 2024, encadré par SOC.
  assert.deepEqual(siglesSuccessifs([
    g("SOC", "2023-10-19", "2024-06-09"), g("NI", "2024-07-08", "2024-07-18"), g("SOC", "2024-07-19", ""),
  ]), ["SOC"]);
});

test("départ réel du groupe : la non-inscription finale reste", () => {
  // Cas réel : départ du RN en janvier 2026, non-inscription depuis.
  assert.deepEqual(siglesSuccessifs([g("RN", "2024-07-19", "2026-01-05"), g("NI", "2026-01-06", "")]), ["RN", "NI"]);
});

test("doublons consécutifs fusionnés, ordre chronologique respecté", () => {
  assert.deepEqual(siglesSuccessifs([
    g("LFI-NFP", "2022-06-29", "2023-10-18"), g("LFI-NFP", "2023-10-19", "2024-06-09"),
  ]), ["LFI-NFP"]);
  // Une autre appartenance entre deux passages au même sigle : tout reste.
  assert.deepEqual(siglesSuccessifs([
    g("NI", "2024-01-01", "2024-10-01"), g("SOC", "2024-10-02", "2025-06-01"), g("NI", "2025-06-02", ""),
  ]), ["NI", "SOC", "NI"]);
});
