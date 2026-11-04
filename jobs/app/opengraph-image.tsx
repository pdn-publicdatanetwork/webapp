import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "DataParl' Jobs";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#ECF1FC",
          gap: 28,
        }}
      >
        <div style={{ display: "flex", fontSize: 110, fontWeight: 700, color: "#4E2E53" }}>
          Data<span style={{ background: "#E4BDE9", padding: "0 14px", borderRadius: 10, color: "#4E2E53" }}>Parl'</span>
          <span style={{ color: "#6C84B0", fontWeight: 600, marginLeft: 14 }}>Jobs</span>
        </div>
        <div style={{ fontSize: 38, color: "#475569", maxWidth: 900, textAlign: "center" }}>
          Toutes les offres de collaborateur parlementaire : Assemblée nationale, Sénat, Parlement européen.
        </div>
        <div style={{ background: "#4E2E53", color: "#ffffff", fontSize: 30, padding: "14px 36px", borderRadius: 14 }}>
          jobs.dataparl.fr
        </div>
      </div>
    ),
    size
  );
}
