import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Frens spreads by people sending each other links — an invite is the product's
// front door — so the share card is a real surface, not an afterthought. Applied
// at the root segment so every route (including /invite/[token]) inherits it.

export const alt = "Coworking Frens — cada semana tus amigos abren su casa para laburar juntos";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Brand tokens resolved to sRGB: satori has no OKLCH, and these must not drift
// from src/app/globals.css.
const SAND = "#efe7da";
const SHEET = "#fffdfa";
const INK = "#211c17";
const INK_SOFT = "#625245";
const CORAL = "#c55123";

export default async function OpengraphImage() {
  const display = await readFile(join(process.cwd(), "assets/BricolageGrotesque-Bold.woff"));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: SAND,
          padding: "68px 76px",
          fontFamily: "Bricolage",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: 18,
              background: CORAL,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: SHEET,
              fontSize: 34,
            }}
          >
            F
          </div>
          <div style={{ marginLeft: 18, fontSize: 40, color: INK, letterSpacing: "-0.01em" }}>
            Frens
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 94,
              lineHeight: 1.0,
              color: INK,
              letterSpacing: "-0.035em",
              maxWidth: 940,
            }}
          >
            Coworking entre amigos
          </div>
          <div
            style={{
              marginTop: 30,
              fontSize: 33,
              lineHeight: 1.35,
              color: INK_SOFT,
              maxWidth: 820,
            }}
          >
            Cada semana tus amigos abren su casa para laburar juntos. Vos elegís a cuál ir.
          </div>
        </div>

        <div style={{ display: "flex", width: 232, height: 14, borderRadius: 99, background: CORAL }} />
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Bricolage", data: display, style: "normal", weight: 700 }],
    },
  );
}
