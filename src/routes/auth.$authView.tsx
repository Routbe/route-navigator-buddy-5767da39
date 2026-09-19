import { createFileRoute, notFound } from "@tanstack/react-router";

import AuthNeon from "@/pages/AuthNeon";

/**
 * Inloggen en aanmelden via de eigen ROUT-kaart; de Neon Auth-client
 * regelt OAuth, magic links en wachtwoorden eronder.
 * `/auth/sign-in` en `/auth/sign-up` zijn de enige eigen schermen —
 * overige views (reset e.d.) komen van de Neon Auth-service zelf.
 */
export const Route = createFileRoute("/auth/$authView")({
  head: () => ({
    meta: [
      { title: "Inloggen of aanmelden bij ROUT" },
      {
        name: "description",
        content: "Meld je aan of maak een account om je QR-codes en korte links te beheren.",
      },
      { property: "og:title", content: "Inloggen of aanmelden bij ROUT" },
      {
        property: "og:description",
        content: "Meld je aan of maak een account om je QR-codes en korte links te beheren.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { authView } = Route.useParams();
  if (authView === "sign-in") return <AuthNeon initialMode="magic" />;
  if (authView === "sign-up") return <AuthNeon initialMode="signup" />;
  throw notFound();
}
