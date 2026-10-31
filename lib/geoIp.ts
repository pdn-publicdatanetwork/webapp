import "server-only";
import { Reader, type CountryResponse } from "maxmind";
import { authAdmin } from "./supabaseAdmin";

// Pays d'une adresse IP, sans aucun appel externe : la base mmdb
// (db-ip « country lite », licence CC BY 4.0 : https://db-ip.com) est
// chargée depuis le bucket privé « geoip » du projet auth et mise en cache
// pour six heures. L'IP ne quitte jamais nos serveurs.
// Fichier absent ou illisible : aucun pays, la détection « pays nouveau »
// reste simplement inactive (pas d'erreur, pas d'envoi).

const BUCKET = "geoip";
const FICHIER = "dbip-country-lite.mmdb";
const TTL_MS = 6 * 3600_000;

let cache: { le: number; reader: Reader<CountryResponse> | null } = { le: 0, reader: null };

async function lecteur(): Promise<Reader<CountryResponse> | null> {
  if (cache.reader && Date.now() - cache.le < TTL_MS) return cache.reader;
  const { data, error } = await authAdmin().storage.from(BUCKET).download(FICHIER);
  if (error || !data) return null;
  try {
    cache = { le: Date.now(), reader: new Reader<CountryResponse>(Buffer.from(await data.arrayBuffer())) };
    return cache.reader;
  } catch (e) {
    console.error("geoip", String(e).slice(0, 200));
    return null;
  }
}

// Code pays ISO (ex. « FR »), null si inconnu ou base absente.
export async function paysDepuisIp(ip: string | null): Promise<string | null> {
  if (!ip) return null;
  try {
    const r = await lecteur();
    if (!r) return null;
    return r.get(ip)?.country?.iso_code ?? null;
  } catch {
    return null;
  }
}
