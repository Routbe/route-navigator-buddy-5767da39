import { Link as RouterLink, useRouter } from "@tanstack/react-router";
import { NeonAuthUIProvider } from "@neondatabase/neon-js/auth/react/ui";
import { neonAuth } from "@/lib/neon";
import type { ReactNode } from "react";

/**
 * Koppelt de Neon Auth (Better Auth) UI aan TanStack Router: navigatie,
 * links en de standaard bestemming na sign-in (/dashboard).
 */

function NeonLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <RouterLink to={href as never} className={className}>
      {children}
    </RouterLink>
  );
}

export function NeonAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    <NeonAuthUIProvider
      authClient={neonAuth}
      navigate={(href: string) => void router.navigate({ to: href as never })}
      replace={(href: string) => void router.navigate({ to: href as never, replace: true })}
      Link={NeonLink}
      redirectTo="/dashboard"
      defaultTheme="system"
    >
      {children}
    </NeonAuthUIProvider>
  );
}
