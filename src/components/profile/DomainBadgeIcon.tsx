/**
 * Zwarte domeinbadge: bewijst dat de eigenaar deze domeinnaam via de DNS-zone
 * claimde. Het vinkje staat in wit binnen een zwarte schijf en houdt altijd een
 * lichte rand, zodat het ook op een zwarte achtergrond zichtbaar blijft.
 */
export function DomainBadgeIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} role="img" aria-hidden focusable="false">
      <circle cx="12" cy="12" r="11" fill="#0b0b0c" stroke="#ffffff" strokeOpacity="0.55" />
      <ellipse
        cx="12"
        cy="12"
        rx="5"
        ry="7.5"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.5"
        strokeWidth="1"
      />
      <path d="M4.6 12h14.8" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1" />
      <path
        d="M8.2 12.4l2.6 2.6 5-5.4"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
