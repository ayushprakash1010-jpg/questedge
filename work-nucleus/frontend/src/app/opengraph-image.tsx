import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "QuestEdge — AI-Powered Referral Hiring Marketplace";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          backgroundColor: "#0B0F19",
          backgroundImage:
            "radial-gradient(circle at 25% 25%, rgba(99, 102, 241, 0.25) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(139, 92, 246, 0.25) 0%, transparent 50%)",
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              backgroundColor: "#4F46E5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "32px",
              fontWeight: 800,
            }}
          >
            Q
          </div>
          <span
            style={{
              color: "white",
              fontSize: "36px",
              fontWeight: 800,
              letterSpacing: "-0.5px",
            }}
          >
            QuestEdge
          </span>
          <div
            style={{
              marginLeft: "16px",
              padding: "6px 14px",
              borderRadius: "999px",
              backgroundColor: "rgba(99, 102, 241, 0.2)",
              border: "1px solid rgba(99, 102, 241, 0.4)",
              color: "#A5B4FC",
              fontSize: "14px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            Referral Hiring Marketplace
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <h1
            style={{
              fontSize: "64px",
              fontWeight: 900,
              lineHeight: 1.1,
              color: "white",
              letterSpacing: "-1.5px",
              margin: 0,
            }}
          >
            Zero Retainers.
            <br />
            <span
              style={{
                backgroundImage: "linear-gradient(90deg, #818CF8, #C084FC)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Trusted Referrals.
            </span>
            <br />
            Pay Only When They Stay.
          </h1>
          <p
            style={{
              fontSize: "24px",
              color: "#94A3B8",
              maxWidth: "850px",
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            Connect with vetted independent recruiters through 48-hour exclusive claim
            scopes, Google Gemini AI screening, and two-way candidate consent.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "32px",
            borderTop: "1px solid rgba(148, 163, 184, 0.2)",
            paddingTop: "32px",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "#34D399", fontSize: "20px" }}>●</span>
            <span style={{ color: "#CBD5E1", fontSize: "18px", fontWeight: 600 }}>
              ₹0 Upfront Retainer
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "#818CF8", fontSize: "20px" }}>●</span>
            <span style={{ color: "#CBD5E1", fontSize: "18px", fontWeight: 600 }}>
              48h Claim Scope Exclusivity
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "#C084FC", fontSize: "20px" }}>●</span>
            <span style={{ color: "#CBD5E1", fontSize: "18px", fontWeight: 600 }}>
              100% Candidate Consent
            </span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

