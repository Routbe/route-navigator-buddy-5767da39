import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { captureReferralFromUrl } from "@/lib/referral";

/**
 * Uitnodigingslanding: `rout.be/signup?ref=u_jona`. De code wordt 30 dagen
 * bewaard (localStorage + cookie) en de bezoeker gaat door naar het aanmelden.
 */
export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Word lid van ROUT — soevereine digitale identiteit" },
      {
        name: "description",
        content:
          "Claim je eigen ROUT-identiteit met stijlvolle QR-codes, korte links en een publiek profiel. Aanmelden duurt één minuut.",
      },
      { property: "og:title", content: "Word lid van ROUT" },
      {
        property: "og:description",
        content: "Claim je soevereine digitale identiteit en QR-infrastructuur bij ROUT.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignupLanding,
});

function SignupLanding() {
  const navigate = useNavigate();

  useEffect(() => {
    captureReferralFromUrl();
    void navigate({ to: "/auth/$authView", params: { authView: "sign-up" }, replace: true });
  }, [navigate]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
      <h1 className="text-sm text-muted-foreground">Je uitnodiging wordt geopend…</h1>
    </main>
  );
}
