import { createHmac, timingSafeEqual } from "crypto";
import { createFileRoute } from "@tanstack/react-router";

function verifyStripeSignature(body: string, signature: string, secret: string): boolean {
  const parts = Object.fromEntries(
    signature.split(",").map((part) => {
      const [key, ...value] = part.split("=");
      return [key, value.join("=")];
    }),
  );
  const timestamp = parts["t"];
  const expected = parts["v1"];
  if (!timestamp || !expected) return false;

  const signedPayload = `${timestamp}.${body}`;
  const digest = createHmac("sha256", secret).update(signedPayload).digest("hex");
  const left = Buffer.from(expected, "hex");
  const right = Buffer.from(digest, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

export const Route = createFileRoute("/api_/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["STRIPE_WEBHOOK_SECRET"];
        if (!secret) return new Response("Webhook not configured", { status: 503 });

        const signature = request.headers.get("stripe-signature") ?? "";
        const body = await request.text();
        if (!verifyStripeSignature(body, signature, secret)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let event: { id?: string; type?: string };
        try {
          event = JSON.parse(body) as { id?: string; type?: string };
        } catch {
          console.error("[stripe-webhook] onleesbare payload", { bytes: body.length });
          return new Response("Malformed payload", { status: 400 });
        }

        const eventId = event.id ?? null;
        const kind = event.type ?? null;
        const { sql } = await import("@/lib/neon");

        // Idempotency: claim het event met één atomaire insert. Een tweede
        // levering van hetzelfde id doet niets meer zolang de eerste liep of
        // slaagde; alleen een eerder gefaalde poging wordt heropend.
        if (eventId) {
          try {
            const claimed = (await sql`
              insert into public.webhook_events (id, source, kind, status)
              values (${eventId}, 'stripe', ${kind}, 'processing')
              on conflict (id) do update
                 set status = 'processing',
                     attempts = public.webhook_events.attempts + 1,
                     error = null,
                     updated_at = now()
               where public.webhook_events.status = 'failed'
              returning id, attempts
            `) as { id: string; attempts: number }[];
            if (claimed.length === 0) {
              console.info("[stripe-webhook] duplicaat overgeslagen", { eventId, kind });
              return new Response("duplicate", { status: 200 });
            }
          } catch (err) {
            // Kan de claim niet weggeschreven worden, dan liever een 500 zodat
            // Stripe opnieuw levert dan het event stil laten vallen.
            console.error("[stripe-webhook] claim mislukt", {
              eventId,
              kind,
              error: err instanceof Error ? err.message : String(err),
            });
            return new Response("Idempotency store unavailable", { status: 500 });
          }
        }

        const { applyStripeEvent } = await import("@/lib/stripe-events.server");
        try {
          const result = await applyStripeEvent(event);
          if (eventId) {
            await sql`
              update public.webhook_events
                 set status = 'done', result = ${result ?? null},
                     completed_at = now(), updated_at = now()
               where id = ${eventId}
            `;
          }
          console.info("[stripe-webhook] verwerkt", { eventId, kind, result });
          return new Response(result, { status: 200 });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error("[stripe-webhook] verwerking mislukt", {
            eventId,
            kind,
            error: message,
            stack: err instanceof Error ? err.stack : undefined,
          });
          if (eventId) {
            await sql`
              update public.webhook_events
                 set status = 'failed', error = ${message.slice(0, 500)}, updated_at = now()
               where id = ${eventId}
            `.catch(() => undefined);
          }
          // 500 laat Stripe opnieuw leveren; de claim staat op 'failed' en mag heropend worden.
          return new Response("Processing failed", { status: 500 });
        }
      },
    },
  },
});
