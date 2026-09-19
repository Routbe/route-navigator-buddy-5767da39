import { useMemo, useState } from "react";
import { Check, Code2, Copy, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/** "Verified on ROUT"-badge voor de eigen site van de maker (SEO-backlink). */
export function VerifiedBadgeCard({
  handle,
  verified = true,
  siteUrl = "https://rout.be",
}: {
  handle: string | null;
  /** Alleen geverifieerde (Pro) leden mogen de "Verified"-badge embedden. */
  verified?: boolean;
  siteUrl?: string;
}) {
  const [copied, setCopied] = useState<"html" | "svg" | null>(null);
  const clean = (handle ?? "").replace(/^@+/, "").toLowerCase();

  const snippets = useMemo(() => {
    const badge = `${siteUrl}/api/public/badge/${verified ? clean : `u/${clean}`}`;
    const profile = verified ? `${siteUrl}/${clean}` : `${siteUrl}/u/${clean}`;
    return {
      html: `<a href="${profile}" target="_blank" rel="noopener">\n  <img src="${badge}" alt="Verified on ROUT — @${clean}" width="220" height="40" loading="lazy" />\n</a>`,
      svg: badge,
    };
  }, [clean, siteUrl, verified]);

  async function copy(kind: "html" | "svg") {
    try {
      await navigator.clipboard.writeText(kind === "html" ? snippets.html : snippets.svg);
      setCopied(kind);
      toast.success("Gekopieerd naar je klembord.");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Kopiëren mislukt — selecteer de code handmatig.");
    }
  }

  if (!clean) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-2">
          <Code2 className="h-4 w-4" aria-hidden />
          {verified ? "Badge voor je eigen site" : "Privacy Shield-badge"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{verified ? "Verified on ROUT-badge" : "Privacy Shield-badge"}</DialogTitle>
        </DialogHeader>
        {!verified && (
          <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
            <Lock className="mr-1.5 inline h-3.5 w-3.5 align-[-2px]" aria-hidden />
            De <strong>Verified on ROUT</strong>-badge is voorbehouden aan geverifieerde Pro-leden.
            Als gratis lid gebruik je de Privacy Shield-badge, die naar je alias-profiel linkt.
          </p>
        )}
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4">
            <img
              src={snippets.svg}
              alt={`Verified on ROUT — @${clean}`}
              width={220}
              height={40}
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Plaats deze HTML in je footer. De badge linkt terug naar je ROUT-profiel.
            </p>
            <pre className="max-h-44 select-all overflow-x-auto whitespace-pre-wrap break-all rounded-2xl border border-border/80 bg-muted/60 p-4 font-mono text-xs leading-relaxed text-muted-foreground">
              <code>{snippets.html}</code>
            </pre>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" size="sm" onClick={() => copy("html")} className="gap-2">
                {copied === "html" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied === "html" ? "Gekopieerd!" : "HTML kopiëren"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => copy("svg")}
                className="gap-2"
              >
                {copied === "svg" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied === "svg" ? "Gekopieerd!" : "SVG-URL kopiëren"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default VerifiedBadgeCard;
