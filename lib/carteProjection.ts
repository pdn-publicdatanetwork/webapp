// Projection des marqueurs de la carte des permanences, calée sur
// lib/carteDepartements.ts (même équirectangulaire corrigée par cos(46,6°)).
// Constantes obtenues par régression sur les premiers sommets des contours
// générés (résidus < 1 px). Le générateur scripts/carte-departements.mjs
// calcule sa bounding box en itérant f.geometry.coordinates comme des anneaux :
// les départements MultiPolygon n'y contribuent pas, d'où un minLon « inland »
// (-3,66) : c'est voulu ici : on doit réutiliser exactement ces constantes.

export const VIEWBOX = "0 0 1000 1061";

const K_LON = 75.627; // px par degré de longitude (facteur cos(46,6°) inclus)
const M_LAT = 110.107; // px par degré de latitude
const MIN_LON = -3.6618;
const MAX_LAT = 51.005;

export type PointCarte = { x: number; y: number };

// Longitude/latitude WGS-84 (sortie BAN) → coordonnées SVG de la carte.
export function projeter(lon: number, lat: number): PointCarte {
  return { x: +((lon - MIN_LON) * K_LON).toFixed(1), y: +((MAX_LAT - lat) * M_LAT).toFixed(1) };
}
