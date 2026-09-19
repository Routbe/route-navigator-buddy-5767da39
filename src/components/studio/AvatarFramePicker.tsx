import { useState } from "react";
import { cn } from "@/lib/utils";
import { AvatarFrameWrapper } from "@/components/profile/AvatarFrameWrapper";
import {
  AVATAR_FRAME_CATEGORIES,
  AVATAR_FRAME_DEFS,
  type AvatarFrame,
  type AvatarFrameCategory,
  type FrameTheme,
} from "@/lib/avatar-frames";

/** Rasterkiezer met 24 avatarkaders, categoriefilters en live voorbeelden. */
export function AvatarFramePicker({
  value,
  onChange,
  avatarUrl,
  theme,
}: {
  value: AvatarFrame;
  onChange: (frame: AvatarFrame) => void;
  avatarUrl: string;
  theme: FrameTheme;
}) {
  const [filter, setFilter] = useState<"all" | AvatarFrameCategory>("all");
  const frames = AVATAR_FRAME_DEFS.filter((f) => filter === "all" || f.category === filter);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {AVATAR_FRAME_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setFilter(c.id)}
            className={cn(
              "h-8 rounded-full border px-3 text-[11px] font-medium transition-colors",
              filter === c.id ? "border-primary/50 bg-primary/10" : "border-border",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {frames.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onChange(f.id)}
            aria-pressed={value === f.id}
            title={f.label}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-all hover:-translate-y-0.5",
              value === f.id ? "border-primary ring-1 ring-primary" : "border-border",
            )}
          >
            <AvatarFrameWrapper frame={f.id} theme={theme}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover"
                  aria-hidden
                />
              ) : (
                <span
                  className="block h-10 w-10 rounded-full"
                  style={{ background: theme.card }}
                  aria-hidden
                />
              )}
            </AvatarFrameWrapper>
            <span className="line-clamp-1 text-[10px] text-muted-foreground">{f.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
