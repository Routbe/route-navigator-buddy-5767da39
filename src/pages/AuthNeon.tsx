import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@/lib/router-compat";
import { toast } from "sonner";
import { ArrowLeft, KeyRound, Loader2, Mail, MailCheck, ShieldCheck } from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordField } from "@/components/PasswordField";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { neonAuth } from "@/lib/neon";
import { authCallbackUrl } from "@/lib/app-url";
import { BRAND_ICONS } from "@/utils/brandIcons";

/** Official multi-colour Google "G" — required by Google Identity branding. */
function GoogleColorMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 6-1.08 8-2.93l-3.88-3.05c-1.08.72-2.45 1.16-4.12 1.16-3.17 0-5.85-2.14-6.81-5.02H1.18v3.15C3.15 21.23 7.27 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.19 14.16c-.24-.72-.38-1.49-.38-2.28s.14-1.56.38-2.28V6.45H1.18C.43 7.94 0 9.91 0 12s.43 4.06 1.18 5.55l4.01-3.39z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.99 1.19 15.24 0 12 0 7.27 0 3.15 2.77 1.18 6.45l4.01 3.39c.96-2.88 3.64-5.09 6.81-5.09z"
      />
    </svg>
  );
}

/**
 * Provider-tegels. Elke tegel start een Neon Auth OAuth-flow
 * (`neonAuth.signIn.social`) met het officiële merklogo in de merkkleur.
 */
const TILES: { id: string; label: string; provider: string; mark: string; color: string }[] = [
  {
    id: "github",
    label: "GitHub",
    provider: "github",
    mark: BRAND_ICONS.github!.path,
    color: BRAND_ICONS.github!.color,
  },
  {
    id: "google",
    label: "Google",
    provider: "google",
    mark: BRAND_ICONS.google!.path,
    color: BRAND_ICONS.google!.color,
  },
  {
    id: "mastodon",
    label: "Mastodon / Fediverse",
    provider: "mastodon",
    mark: BRAND_ICONS.mastodon!.path,
    color: BRAND_ICONS.mastodon!.color,
  },
  {
    id: "keycloak",
    label: "Keycloak / OIDC",
    provider: "oidc",
    mark: BRAND_ICONS.keycloak!.path,
    color: BRAND_ICONS.keycloak!.color,
  },
  {
    id: "gitlab",
    label: "GitLab",
    provider: "gitlab",
    mark: BRAND_ICONS.gitlab!.path,
    color: BRAND_ICONS.gitlab!.color,
  },
];

/** Deliberately permissive: catches typos, never rejects a valid address. */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 10;

type Mode = "magic" | "password" | "signup";

function errorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return fallback;
}

/**
 * De eigen ROUT-inlogkaart ("Verder naar ROUT"), met Neon Auth eronder:
 * OAuth via `neonAuth.signIn.social`, e-mail via `neonAuth.signIn.magicLink`
 * en wachtwoord via `neonAuth.signIn.email` / `neonAuth.signUp.email`.
 */
export default function AuthNeon({ initialMode = "magic" }: { initialMode?: Mode }) {
  const { t } = useI18n();
  const nav = useNavigate();
  const { user, refresh } = useAuth();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<Mode>(initialMode);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const redirected = useRef(false);

  useEffect(() => {
    if (!user || redirected.current) return;
    redirected.current = true;
    nav("/dashboard", { replace: true });
  }, [user, nav]);

  // Altijd de canonieke origin: preview-hosts mogen nooit in een OAuth-redirect
  // belanden, anders weigert Google met `redirect_uri_mismatch`.
  const callbackURL = authCallbackUrl("/dashboard");

  const onEmailChange = (value: string) => {
    setEmail(value);
    setEmailError(value && !EMAIL_REGEX.test(value.trim()) ? t("auth.email.invalid") : null);
  };

  const emailAccepted = () => {
    if (EMAIL_REGEX.test(email.trim())) return true;
    const message = t("auth.email.invalid");
    setEmailError(message);
    toast.error(message);
    return false;
  };

  /** OAuth via Neon Auth — de service stuurt door naar de provider. */
  const oauth = async (provider: string) => {
    setLoading(true);
    try {
      const result = await neonAuth.signIn.social({ provider, callbackURL });
      const error = (result as { error?: { message?: string } } | undefined)?.error;
      if (error) toast.error(error.message || t("auth.toast.failed"));
    } catch (err) {
      toast.error(errorMessage(err, t("auth.toast.failed")));
    } finally {
      setLoading(false);
    }
  };

  /** Passwordless: Neon Auth mailt een eenmalige inloglink. */
  const continueWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailAccepted()) return;
    setLoading(true);
    const address = email.trim().toLowerCase();
    try {
      const result = await neonAuth.signIn.magicLink({ email: address, callbackURL });
      const error = (result as { error?: { message?: string } } | undefined)?.error;
      if (error) {
        toast.error(error.message || t("auth.toast.signinFailed"));
        return;
      }
      setSentTo(address);
    } catch (err) {
      toast.error(errorMessage(err, t("auth.toast.signinFailed")));
    } finally {
      setLoading(false);
    }
  };

  const signInWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailAccepted()) return;
    setLoading(true);
    try {
      const result = await neonAuth.signIn.email({
        email: email.trim().toLowerCase(),
        password,
        callbackURL,
      });
      const error = (result as { error?: { message?: string } } | undefined)?.error;
      if (error) {
        toast.error(error.message || t("auth.toast.signinFailed"));
        return;
      }
      toast.success(t("auth.toast.welcome"));
      await refresh();
    } catch (err) {
      toast.error(errorMessage(err, t("auth.toast.signinFailed")));
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailAccepted()) return;
    if (password.length < MIN_PASSWORD_LENGTH) {
      toast.error(`Gebruik minstens ${MIN_PASSWORD_LENGTH} tekens.`);
      return;
    }
    setLoading(true);
    const address = email.trim().toLowerCase();
    try {
      const result = await neonAuth.signUp.email({
        email: address,
        password,
        name: address.split("@")[0] ?? address,
        callbackURL,
      });
      const error = (result as { error?: { message?: string } } | undefined)?.error;
      if (error) {
        toast.error(error.message || t("auth.toast.failed"));
        return;
      }
      toast.success(t("auth.toast.welcome"));
      await refresh();
    } catch (err) {
      toast.error(errorMessage(err, t("auth.toast.failed")));
    } finally {
      setLoading(false);
    }
  };

  const emailField = (
    <div className="space-y-1">
      <Label htmlFor="auth-email" className="text-sm">
        {t("auth.email.label")}
      </Label>
      <Input
        id="auth-email"
        type="email"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        placeholder="you@domain.com"
        autoComplete="email"
        aria-invalid={emailError ? true : undefined}
        aria-describedby={emailError ? "auth-email-error" : undefined}
        className={`h-10 rounded-lg ${emailError ? "border-destructive focus-visible:ring-destructive/30" : ""}`}
        required
      />
      {emailError && (
        <p id="auth-email-error" className="text-[11px] text-destructive">
          {emailError}
        </p>
      )}
    </div>
  );

  return (
    <AppLayout>
      <div className="flex min-h-[calc(100vh-4rem)] w-full flex-col items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> {t("auth.back")}
          </Link>
        </div>

        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 sm:p-7">
          <div className="mb-4">
            <h1 className="mb-1 font-display text-2xl text-foreground">{t("auth.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("auth.subtitle")}</p>
          </div>

          <div
            data-testid="auth-provider-tiles"
            className="mt-1 grid grid-cols-3 gap-2 sm:grid-cols-5"
          >
            {TILES.map((tile) => (
              <button
                key={tile.id}
                type="button"
                onClick={() => void oauth(tile.provider)}
                disabled={loading}
                aria-label={`Verder met ${tile.label}`}
                title={`Verder met ${tile.label}`}
                className="group flex h-11 items-center justify-center gap-2 rounded-xl border border-border/60 bg-card/60 p-2 transition-all hover:border-border hover:bg-muted/50 disabled:opacity-60"
              >
                {tile.id === "google" ? (
                  <GoogleColorMark className="h-[18px] w-[18px] shrink-0" />
                ) : (
                  <svg
                    className="h-[18px] w-[18px] shrink-0"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    style={{ color: tile.color }}
                    aria-hidden
                  >
                    <path d={tile.mark} />
                  </svg>
                )}
                <span className="sr-only">{`Verder met ${tile.label}`}</span>
              </button>
            ))}
          </div>

          <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3 w-3 shrink-0" aria-hidden /> {t("auth.sso.note")}
          </p>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              {t("auth.divider")}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {sentTo ? (
            <div
              data-testid="auth-link-sent"
              className="mx-auto w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card/60 p-4 text-center sm:p-6"
            >
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted/60">
                <MailCheck className="h-5 w-5" aria-hidden />
              </span>
              <h2 className="font-display text-lg">{t("auth.sent.title")}</h2>
              <p className="mx-auto max-w-xs text-[13px] leading-relaxed text-muted-foreground">
                {t("auth.sent.body1")}{" "}
                <strong className="font-medium text-foreground">{sentTo}</strong>.
              </p>
              <button
                type="button"
                onClick={() => setSentTo(null)}
                className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                {t("auth.other")}
              </button>
            </div>
          ) : mode === "magic" ? (
            <form onSubmit={continueWithEmail} className="space-y-3.5">
              {emailField}
              <Button
                type="submit"
                className="h-11 w-full rounded-lg font-medium"
                disabled={loading || !!emailError}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />{" "}
                    {t("auth.continue.sending")}
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" aria-hidden /> {t("auth.continue.cta")}
                  </>
                )}
              </Button>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {t("auth.continue.note")}
              </p>
              <button
                type="button"
                onClick={() => setMode("password")}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                <KeyRound className="h-3.5 w-3.5" aria-hidden /> {t("auth.havePassword")}
              </button>
            </form>
          ) : mode === "password" ? (
            <form onSubmit={signInWithPassword} className="space-y-3.5">
              {emailField}
              <PasswordField value={password} onChange={setPassword} required minLength={8} />
              <Button
                type="submit"
                className="h-11 w-full rounded-lg font-medium"
                disabled={loading || !!emailError}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth.password.signin")}
              </Button>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setMode("magic")}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  <Mail className="h-3.5 w-3.5" aria-hidden /> {t("auth.password.magic")}
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="text-[11px] text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  {t("auth.signup.cta")}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={signUp} className="space-y-3.5">
              {emailField}
              <PasswordField
                value={password}
                onChange={setPassword}
                required
                minLength={MIN_PASSWORD_LENGTH}
              />
              <Button
                type="submit"
                className="h-11 w-full rounded-lg font-medium"
                disabled={loading || !!emailError}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth.signup.cta")}
              </Button>
              <button
                type="button"
                onClick={() => setMode("magic")}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                <Mail className="h-3.5 w-3.5" aria-hidden /> {t("auth.password.magic")}
              </button>
            </form>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
