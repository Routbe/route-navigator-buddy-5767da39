import { createFileRoute } from "@tanstack/react-router";
import { AccountView, RedirectToSignIn, SignedIn, SignedOut } from "@neondatabase/neon-js/auth/react/ui";

/**
 * Neon Auth accountbeheer: /account/settings, /account/security, …
 * Alleen zichtbaar met een actieve Neon Auth-sessie; anders door naar sign-in.
 */
export const Route = createFileRoute("/account/$accountView")({
  head: () => ({
    meta: [
      { title: "Je account bij ROUT" },
      {
        name: "description",
        content: "Beheer je profiel, beveiliging en sessies van je ROUT-account.",
      },
      { property: "og:title", content: "Je account bij ROUT" },
      {
        property: "og:description",
        content: "Beheer je profiel, beveiliging en sessies van je ROUT-account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NeonAccountPage,
});

function NeonAccountPage() {
  const { accountView } = Route.useParams();

  return (
    <div className="flex min-h-screen items-start justify-center bg-background px-4 py-12">
      <SignedIn>
        <AccountView path={accountView} />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </div>
  );
}
