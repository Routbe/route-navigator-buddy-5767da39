import { Input } from "@/components/ui/input";
import { AvatarUpload } from "@/components/settings/AvatarUpload";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { styledProfilePath, type UrlStyle } from "@/lib/profile-url";
import { toast } from "sonner";

interface ProfileBasicInfoFormProps {
  displayName: string;
  onDisplayNameChange: (value: string) => void;
  tagline: string;
  onTaglineChange: (value: string) => void;
  avatarUrl: string;
  onAvatarUrlChange: (value: string) => void;
  normalized: string;
  urlStyle: UrlStyle;
  onEditHandle: () => void;
}

/**
 * Basisidentiteit van het profiel: naam, tagline, avatar en de publieke
 * profiel-URL met snelkoppelingen naar "Edit handle" / "Copy link".
 */
export function ProfileBasicInfoForm({
  displayName,
  onDisplayNameChange,
  tagline,
  onTaglineChange,
  avatarUrl,
  onAvatarUrlChange,
  normalized,
  urlStyle,
  onEditHandle,
}: ProfileBasicInfoFormProps) {
  return (
    <AccordionItem
      value="profile_info"
      className="rounded-2xl border border-border bg-card px-4 sm:px-5"
    >
      <AccordionTrigger className="hover:no-underline">
        <span className="text-base font-medium">👤 Profiel Basisinformatie</span>
      </AccordionTrigger>
      <AccordionContent className="space-y-4 pb-5">
        {/* Permanent Profile Info Card */}
        <section className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
          <h2 className="text-lg font-medium">Profile Info</h2>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="w-full sm:max-w-xs">
              <AvatarUpload
                value={avatarUrl || null}
                name={displayName}
                onChange={(url) => onAvatarUrlChange(url ?? "")}
              />
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              <Input
                value={displayName}
                maxLength={60}
                placeholder="Jona Zeno"
                onChange={(e) => onDisplayNameChange(e.target.value)}
                className="input-field h-10 rounded-xl"
                aria-label="Display Name"
              />
              <Input
                value={tagline}
                maxLength={120}
                placeholder="Open-source developer & designer"
                onChange={(e) => onTaglineChange(e.target.value)}
                className="input-field h-10 rounded-xl"
                aria-label="Bio / Tagline"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
              rout.be{styledProfilePath(normalized || "handle", urlStyle)}
            </span>
            <button
              type="button"
              onClick={onEditHandle}
              className="shrink-0 rounded-lg border border-border px-2 py-1 text-[11px] font-medium hover:bg-muted"
            >
              Edit handle
            </button>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(
                  `https://rout.be${styledProfilePath(normalized || "handle", urlStyle)}`,
                );
                toast.success("Link copied!");
              }}
              className="shrink-0 rounded-lg border border-border px-2 py-1 text-[11px] font-medium hover:bg-muted"
            >
              Copy link
            </button>
          </div>
        </section>
      </AccordionContent>
    </AccordionItem>
  );
}
