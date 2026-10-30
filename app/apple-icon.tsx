import { ImageResponse } from "next/og";

// Icône tactile iOS (180x180) du site principal.
// Monogramme « Σ' » blanc sur bleu encre #071A41 : même identité que /icon.svg,
// appliqué à tous les domaines et sous-domaines DataParl'.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#071A41",
          borderRadius: 40,
          fontSize: 108,
          fontWeight: 700,
          fontFamily: "Georgia, serif",
          color: "#FFFFFF",
        }}
      >
        &Sigma;&apos;
      </div>
    ),
    { ...size }
  );
}
