import { ImageResponse } from "next/og";

// Icône tactile iOS (180x180) : mail.dataparl.fr.
// Monogramme « Σ' » blanc sur fond #C8102F :
// même identité que /icon.svg du domaine correspondant.
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
          background: "#C8102F",
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
