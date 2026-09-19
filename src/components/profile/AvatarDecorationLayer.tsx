import { avatarDecorationDef, type AvatarDecoration } from "@/lib/avatar-decorations";

/**
 * Decoratieve SVG-laag bovenop de avatar (kattenoortjes, halo, koptelefoon …).
 *
 * Alles wordt getekend in een 100×100-veld waarin de avatar de cirkel
 * (50,50 r=50) is. De svg mag buiten dat veld tekenen (`overflow: visible`),
 * zodat oortjes en hoedjes boven de avatar uitsteken.
 */
export function AvatarDecorationLayer({ decoration }: { decoration: AvatarDecoration }) {
  if (decoration === "none") return null;
  const def = avatarDecorationDef(decoration);
  const cls = `pointer-events-none absolute inset-0 h-full w-full ${def.animation ?? ""}`;
  const svg = (children: React.ReactNode) => (
    <svg viewBox="0 0 100 100" className={cls} style={{ overflow: "visible" }} aria-hidden>
      {children}
    </svg>
  );

  switch (decoration) {
    case "cat_ears":
      return svg(
        <g>
          <path d="M12 22 L18 -10 L44 8 Z" fill="#1f2937" />
          <path d="M88 22 L82 -10 L56 8 Z" fill="#1f2937" />
          <path d="M19 18 L22 0 L37 10 Z" fill="#f9a8d4" />
          <path d="M81 18 L78 0 L63 10 Z" fill="#f9a8d4" />
        </g>,
      );
    case "bunny_ears":
      return svg(
        <g>
          <ellipse cx="34" cy="-12" rx="9" ry="26" fill="#f8fafc" transform="rotate(-12 34 -12)" />
          <ellipse cx="66" cy="-12" rx="9" ry="26" fill="#f8fafc" transform="rotate(12 66 -12)" />
          <ellipse cx="34" cy="-10" rx="4" ry="18" fill="#fbcfe8" transform="rotate(-12 34 -10)" />
          <ellipse cx="66" cy="-10" rx="4" ry="18" fill="#fbcfe8" transform="rotate(12 66 -10)" />
        </g>,
      );
    case "devil_horns":
      return svg(
        <g fill="#dc2626">
          <path d="M16 16 C6 4 8 -8 20 -12 C16 0 22 8 28 12 Z" />
          <path d="M84 16 C94 4 92 -8 80 -12 C84 0 78 8 72 12 Z" />
        </g>,
      );
    case "angel_halo":
      return svg(
        <g>
          <ellipse
            cx="50"
            cy="-8"
            rx="30"
            ry="9"
            fill="none"
            stroke="#fde68a"
            strokeWidth="5"
            opacity="0.95"
          />
          <ellipse cx="50" cy="-8" rx="30" ry="9" fill="none" stroke="#fffbeb" strokeWidth="1.5" />
        </g>,
      );
    case "party_hat":
      return svg(
        <g>
          <path d="M50 -26 L34 8 L66 8 Z" fill="#6366f1" />
          <path d="M50 -26 L42 -9 L55 -3 Z" fill="#a5b4fc" />
          <circle cx="50" cy="-28" r="5" fill="#f472b6" />
          {[
            [40, 0],
            [58, -4],
            [48, -14],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="2" fill="#fde68a" />
          ))}
        </g>,
      );
    case "headphones":
      return svg(
        <g>
          <path
            d="M4 52 C4 12 96 12 96 52"
            fill="none"
            stroke="#111827"
            strokeWidth="9"
            strokeLinecap="round"
          />
          <rect x="-6" y="44" width="18" height="30" rx="8" fill="#111827" />
          <rect x="88" y="44" width="18" height="30" rx="8" fill="#111827" />
          <rect x="-2" y="48" width="10" height="22" rx="5" fill="#22d3ee" opacity="0.85" />
          <rect x="92" y="48" width="10" height="22" rx="5" fill="#22d3ee" opacity="0.85" />
        </g>,
      );
    case "cyber_visor":
      return svg(
        <g>
          <rect x="4" y="34" width="92" height="20" rx="10" fill="#0f172a" opacity="0.92" />
          <rect x="10" y="40" width="80" height="8" rx="4" fill="#22d3ee" opacity="0.8" />
          <rect x="10" y="40" width="24" height="8" rx="4" fill="#f0fdff" opacity="0.9" />
        </g>,
      );
    case "pixel_crown":
      return svg(
        <g fill="#fbbf24" stroke="#78350f" strokeWidth="1.5">
          <path d="M22 6 h10 v-10 h10 v-8 h16 v8 h10 v10 h10 v12 H22 Z" />
        </g>,
      );
    case "sakura_branch":
      return svg(
        <g>
          <path
            d="M-4 20 C20 4 46 0 74 -4"
            fill="none"
            stroke="#7c4a2d"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {[
            [10, 14],
            [34, 5],
            [58, -1],
            [76, -6],
          ].map(([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              {[0, 72, 144, 216, 288].map((a) => (
                <ellipse
                  key={a}
                  cx="0"
                  cy="-5"
                  rx="3.2"
                  ry="5"
                  fill="#fbcfe8"
                  stroke="#f472b6"
                  strokeWidth="0.6"
                  transform={`rotate(${a})`}
                />
              ))}
              <circle r="1.8" fill="#fde68a" />
            </g>
          ))}
        </g>,
      );
    case "leaf_crown":
      return svg(
        <g>
          {Array.from({ length: 11 }).map((_, i) => {
            const a = -160 + i * 14;
            return (
              <ellipse
                key={i}
                cx="50"
                cy="-4"
                rx="6"
                ry="3"
                fill={i % 2 ? "#4ade80" : "#16a34a"}
                transform={`rotate(${a} 50 50) translate(0 0) rotate(${a / 2} 50 -4)`}
              />
            );
          })}
        </g>,
      );
    case "snow_cap":
      return svg(
        <g>
          <path
            d="M6 26 C20 -2 80 -2 94 26 C74 12 26 12 6 26 Z"
            fill="#f8fafc"
            stroke="#cbd5e1"
            strokeWidth="1"
          />
          {[
            [22, 6],
            [50, -6],
            [76, 4],
            [36, -12],
            [64, -14],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="2.2" fill="#e0f2fe" />
          ))}
        </g>,
      );
    case "flame_tips":
      return svg(
        <g>
          {[24, 40, 56, 72].map((x, i) => (
            <path
              key={x}
              d={`M${x} 14 C${x - 8} 0 ${x + 2} -6 ${x} -18 C${x + 10} -6 ${x + 8} 2 ${x} 14 Z`}
              fill={i % 2 ? "#f97316" : "#facc15"}
              opacity="0.92"
            />
          ))}
        </g>,
      );
    case "sparkle_dust":
      return svg(
        <g fill="#fde68a">
          {[
            [6, 20, 3],
            [92, 30, 2.4],
            [20, -4, 2.6],
            [78, -6, 3.2],
            [98, 66, 2.2],
            [2, 62, 2.6],
          ].map(([x, y, r], i) => (
            <path
              key={i}
              d={`M${x} ${y - r! * 2} L${x! + r!} ${y} L${x} ${y! + r! * 2} L${x! - r!} ${y} Z`}
            />
          ))}
        </g>,
      );
    case "star_orbit":
      return svg(
        <g className="rout-deco-orbit-inner">
          <circle
            cx="50"
            cy="50"
            r="58"
            fill="none"
            stroke="#a78bfa"
            strokeWidth="1"
            opacity="0.5"
          />
          {[0, 120, 240].map((a) => (
            <g key={a} transform={`rotate(${a} 50 50)`}>
              <path d="M50 -12 L53 -5 L60 -4 L55 1 L56 8 L50 4 L44 8 L45 1 L40 -4 L47 -5 Z" fill="#c4b5fd" />
            </g>
          ))}
        </g>,
      );
    case "ghost_pals":
      return svg(
        <g fill="#e0e7ff" opacity="0.95">
          {[
            [4, 10],
            [96, 22],
          ].map(([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y}) scale(0.9)`}>
              <path d="M-8 6 C-8 -6 8 -6 8 6 L8 12 L4 9 L0 12 L-4 9 L-8 12 Z" />
              <circle cx="-3" cy="2" r="1.4" fill="#1e293b" />
              <circle cx="3" cy="2" r="1.4" fill="#1e293b" />
            </g>
          ))}
        </g>,
      );
    case "bubble_tea":
      return svg(
        <g transform="translate(88 62)">
          <path d="M-8 -12 L8 -12 L6 14 L-6 14 Z" fill="#fde68a" opacity="0.9" />
          <rect x="-9" y="-15" width="18" height="4" rx="2" fill="#f8fafc" />
          <path d="M3 -26 L7 -13" stroke="#f472b6" strokeWidth="3" strokeLinecap="round" />
          {[
            [-3, 9],
            [1, 11],
            [4, 8],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="2" fill="#3f2412" />
          ))}
        </g>,
      );
    default:
      return null;
  }
}
