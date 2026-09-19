import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TrustBadge {
  id: string;
  label: string;
  tooltip: string;
  /** Tailwind class that lights the icon up in its brand-themed colour on hover. */
  accent: string;
  icon: ReactNode;
}

/**
 * Vertrouwensbalk: enkel controleerbare claims, in pristine inline-SVG.
 *
 * Alle vlakken gebruiken de semantische designtokens (card/border/muted), zodat
 * de balk in licht én donker thema klopt; per badge licht enkel het pictogram
 * op in zijn eigen accentkleur. Uitleg zit in de Radix-tooltip én in het
 * `title`-attribuut, zodat aanraakschermen de tekst ook bereiken.
 */
const BADGES: TrustBadge[] = [
  {
    id: "gdpr",
    label: "100% GDPR / AVG Compliant",
    tooltip: "Volledig conform de Europese privacywetgeving. Jouw data is van jou.",
    accent: "group-hover:text-blue-500 dark:group-hover:text-blue-400",
    icon: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </>
    ),
  },
  {
    id: "no-trackers",
    label: "Zero Trackers & Cookie-Free",
    tooltip: "Geen invasieve volgcookies, advertentiepixels of profilering op ROUT-profielen.",
    accent: "group-hover:text-red-500 dark:group-hover:text-red-400",
    icon: (
      <>
        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
        <path d="M10.73 5.08A10.4 10.4 0 0 1 12 5c5.5 0 9 5.5 9 7a12.4 12.4 0 0 1-1.67 2.68" />
        <path d="M6.61 6.61A13.5 13.5 0 0 0 3 12c0 1.5 3.5 7 9 7a10.1 10.1 0 0 0 5.39-1.61" />
        <path d="M3 3l18 18" />
      </>
    ),
  },
  {
    id: "eea",
    label: "EEA Infrastructure",
    tooltip: "Databanken, back-ups en routering blijven binnen de Europese Economische Ruimte.",
    accent: "group-hover:text-emerald-600 dark:group-hover:text-emerald-400",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" />
      </>
    ),
  },
  {
    id: "agpl",
    label: "AGPL-3.0 Open Source",
    tooltip: "Elke regel code is publiek: controleer, fork of host ROUT zelf onder AGPL-3.0.",
    accent: "group-hover:text-violet-600 dark:group-hover:text-purple-400",
    icon: (
      <>
        <path d="M4 4H2v16h2" />
        <path d="M20 4h2v16h-2" />
        <path d="M8.5 16V9.5" />
        <path d="M8.5 9.5h2.2a1.8 1.8 0 0 1 0 3.6H8.5" />
        <path d="M15.5 16v-6.5h2.4" />
      </>
    ),
  },
  {
    id: "tls",
    label: "256-Bit TLS Encrypted",
    tooltip: "Alle verbindingen en gegevens worden versleuteld overgedragen.",
    accent: "group-hover:text-amber-600 dark:group-hover:text-amber-400",
    icon: (
      <>
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </>
    ),
  },
];

export function TrustBadgesBar({ className }: { className?: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <nav
        aria-label="Vertrouwensgaranties"
        className={cn("mx-auto w-full max-w-7xl px-4 py-2", className)}
      >
        <ul className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-border/70 bg-card/60 p-4 text-xs backdrop-blur-md">
          {BADGES.map((badge) => (
            <li key={badge.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    title={badge.tooltip}
                    tabIndex={0}
                    className="group flex min-h-11 cursor-help select-none items-center gap-2.5 rounded-xl border border-border/60 bg-background px-3.5 py-2 transition-colors duration-200 hover:border-foreground/30 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <svg
                      aria-hidden
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={cn(
                        "h-4 w-4 shrink-0 text-muted-foreground transition-colors duration-200",
                        badge.accent,
                      )}
                    >
                      {badge.icon}
                    </svg>
                    <span className="font-medium tracking-wide text-muted-foreground transition-colors duration-200 group-hover:text-foreground">
                      {badge.label}
                    </span>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[16rem] text-xs">
                  {badge.tooltip}
                </TooltipContent>
              </Tooltip>
            </li>
          ))}
        </ul>
      </nav>
    </TooltipProvider>
  );
}

export default TrustBadgesBar;
