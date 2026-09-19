import { BrandLoader } from "@/components/BrandLoader";
import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProfileEditor, type ProfileVariant } from "@/components/dashboard/ProfileEditor";
import { BadgeCheck, Sparkles } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAuth } from "@/hooks/useAuth";

/** /studio — the dedicated Profile Hub (link-in-bio) workspace. */
export default function Studio() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  // Twee losstaande profielen per account: het geverifieerde rootprofiel en het
  // gratis aliasprofiel op /u/<handle>. Elk heeft eigen content en handle.
  const [variant, setVariant] = useState<ProfileVariant>("verified");

  useEffect(() => {
    if (!loading && !user) nav("/auth/sign-in", { replace: true });
  }, [user, loading, nav]);

  return (
    <AppLayout
      width="wide"
      title="Profile Hub Studio"
      description="Your sovereign link-in-bio: components, design, subdomain and verification."
      crumbs={[{ label: "Studio" }]}
      trustBadges
    >
      {loading || !user ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="relative h-24 w-24">
            <BrandLoader label="Studio laden…" />
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col space-y-6 pb-8">
          <div className="flex flex-wrap gap-2 rounded-xl border border-border/60 bg-muted/30 p-1">
            {[
              {
                id: "verified" as ProfileVariant,
                label: "Geverifieerd profiel",
                hint: "rout.be/handle",
                Icon: BadgeCheck,
              },
              {
                id: "alias" as ProfileVariant,
                label: "Gratis aliasprofiel",
                hint: "rout.be/u/handle",
                Icon: Sparkles,
              },
            ].map(({ id, label, hint, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setVariant(id)}
                aria-pressed={variant === id}
                className={`flex flex-1 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                  variant === id
                    ? "bg-background shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="flex flex-col leading-tight">
                  <span className="font-medium">{label}</span>
                  <span className="text-xs opacity-70">{hint}</span>
                </span>
              </button>
            ))}
          </div>
          <ErrorBoundary label="Profile Studio" inline>
            <ProfileEditor key={variant} variant={variant} />
          </ErrorBoundary>
        </div>
      )}
    </AppLayout>
  );
}
