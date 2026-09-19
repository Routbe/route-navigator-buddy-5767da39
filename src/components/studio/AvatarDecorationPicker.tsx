import { useState } from "react";
import { cn } from "@/lib/utils";
import { AvatarFrameWrapper } from "@/components/profile/AvatarFrameWrapper";
import {
  AVATAR_DECORATION_DEFS,
  DECORATION_CATEGORIES,
  PRESENCE_DEFS,
  type AvatarDecoration,
  type DecorationCategory,
  type PresenceStatus,
} from "@/lib/avatar-decorations";
import type { AvatarFrame, FrameTheme } from "@/lib/avatar-frames";

/**
 * Discord-achtige avatardecoraties + aanwezigheidsstatus, met live voorbeeld
 * bovenop het gekozen kader.
 */
export function AvatarDecorationPicker({
  value,
  onChange,
  presence,
  onPresenceChange,
  avatarUrl,
  frame,
  theme,
}: {
  value: AvatarDecoration;
  onChange: (next: AvatarDecoration) => void;
  presence: PresenceStatus;
  onPresenceChange: (next: PresenceStatus) => void;
  avatarUrl: string;
  frame: AvatarFrame;
  theme: FrameTheme;
}) {
  const [filter, setFilter] = useState<"all" | DecorationCategory>("all");
  const items = AVATAR_DECORATION_DEFS.filter((d) => filter === "all" || d.category === filter);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {DECORATION_CATEGORIES.map((c) => (
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

      <div className="grid grid-cols-3 gap-2 pt-3 sm:grid-cols-4 lg:grid-cols-6">
        {items.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => onChange(d.id)}
            aria-pressed={value === d.id}
            title={d.label}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl border px-2 pb-2 pt-6 transition-all hover:-translate-y-0.5",
              value === d.id ? "border-primary ring-1 ring-primary" : "border-border",
            )}
          >
            <AvatarFrameWrapper frame={frame} theme={theme} decoration={d.id}>
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
            <span className="line-clamp-1 text-[10px] text-muted-foreground">{d.label}</span>
          </button>
        ))}
      </div>

      <div className="space-y-2 border-t border-border pt-4">
        <p className="input-label">Statusbolletje</p>
        <div className="flex flex-wrap gap-2">
          {PRESENCE_DEFS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPresenceChange(p.id)}
              aria-pressed={presence === p.id}
              title={p.hint}
              className={cn(
                "flex h-9 items-center gap-2 rounded-full border px-3 text-[11px] font-medium transition-colors",
                presence === p.id ? "border-primary/50 bg-primary/10" : "border-border",
              )}
            >
              <span
                aria-hidden
                className="h-2.5 w-2.5 rounded-full border border-border"
                style={{ background: p.color }}
              />
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
