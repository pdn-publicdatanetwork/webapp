// Logos des groupes parlementaires embarqués (base64), servis par
// /media/logos-groupes/<fichier>. Un module par logo pour garder les
// fichiers de taille raisonnable. Sources : pages Wikipedia des groupes,
// miniatures 200px (vérifier les conditions d'utilisation avant
// réutilisation hors du site).
import { B64 as SOC_B64, MIME as SOC_MIME } from "./logos-groupes/socsenat";
import { B64 as LR_B64, MIME as LR_MIME } from "./logos-groupes/lrsenat";
import { B64 as RDSE_B64, MIME as RDSE_MIME } from "./logos-groupes/rdsesenat";
import { B64 as PS_B64, MIME as PS_MIME } from "./logos-groupes/pssenat";
import { B64 as CRCEK_B64, MIME as CRCEK_MIME } from "./logos-groupes/crceksenat";
import { B64 as ECOS_B64, MIME as ECOS_MIME } from "./logos-groupes/ecossenat";

export const LOGOS_GROUPES_EMBARQUES: Record<string, { type: string; b64: string }> = {
  "soc-senat.png": { type: SOC_MIME, b64: SOC_B64 },
  "lr-senat.png": { type: LR_MIME, b64: LR_B64 },
  "rdse-senat.png": { type: RDSE_MIME, b64: RDSE_B64 },
  "ps-senat.png": { type: PS_MIME, b64: PS_B64 },
  "crce-k-senat.jpg": { type: CRCEK_MIME, b64: CRCEK_B64 },
  "ecos-senat.jpg": { type: ECOS_MIME, b64: ECOS_B64 },
};
