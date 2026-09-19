import { useState, type CSSProperties, type FormEvent } from "react";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

import { Turnstile } from "@/components/Turnstile";
import { submitLeadCapture } from "@/lib/lead-capture.functions";
import { CONTACT_MESSAGE_MAX, type ContactFormConfig } from "@/lib/contact-form";

/** Publiek contactformulier / e-mailcapture met Brevo-notificatie voor de eigenaar. */
export function ContactFormCard({
  handle,
  config,
  style,
}: {
  handle: string;
  config: ContactFormConfig;
  style?: CSSProperties;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const res = await submitLeadCapture({
        data: {
          handle,
          name: config.nameField ? name : null,
          email,
          message: config.messageField ? message : null,
          turnstileToken: token,
        },
      });
      if (res.ok) {
        setDone(true);
        toast.success(res.message);
        if (config.redirectUrl) window.location.href = config.redirectUrl;
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Versturen lukte niet. Probeer het later opnieuw.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="w-full overflow-hidden rounded-2xl border border-zinc-200/80 p-4 text-left shadow-sm"
      style={style}
    >
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Mail className="h-4 w-4 shrink-0" aria-hidden />
        {config.title}
      </p>
      {config.subtitle && <p className="mt-1 text-xs opacity-70">{config.subtitle}</p>}

      {done ? (
        <p className="mt-3 text-sm font-medium">{config.successMessage}</p>
      ) : (
        <form onSubmit={onSubmit} className="mt-3 space-y-2">
          {config.nameField && (
            <input
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
              placeholder="Je naam"
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="Naam"
            />
          )}
          <input
            type="email"
            required
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
            placeholder="jij@voorbeeld.be"
            maxLength={200}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="E-mailadres"
          />
          {config.messageField && (
            <textarea
              className="min-h-20 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
              placeholder="Je bericht…"
              maxLength={CONTACT_MESSAGE_MAX}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              aria-label="Bericht"
            />
          )}
          <Turnstile onToken={setToken} />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Versturen
          </button>
        </form>
      )}
    </div>
  );
}
