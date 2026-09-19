import { type Dispatch, type SetStateAction, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  GripVertical,
  ImagePlus,
  Pin,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SocialPlatformIcon } from "@/lib/social-icons";
import { SocialHandleInput } from "@/components/SocialHandleInput";
import { isHandleBlock } from "@/lib/social-handles";
import { cn } from "@/lib/utils";
import { inputHint, QUICK_CREATE } from "@/lib/profile-editor-utils";
import {
  BLOCK_KINDS,
  blockHref,
  brandOf,
  isPromoBlock,
  sanitizeUrl,
  PROMO_BADGE_PRESETS,
  PROMO_COPY_PRESETS,
  type ProfileBlock,
} from "@/lib/profile";
import { BookingBlockSettings } from "@/components/dashboard/BookingBlockSettings";
import { GalleryBlockSettings } from "@/components/dashboard/GalleryBlockSettings";
import { MediaEmbedBlockSettings } from "@/components/dashboard/MediaEmbedBlockSettings";
import { ContactFormBlockSettings } from "@/components/dashboard/ContactFormBlockSettings";
import { EventListBlockSettings } from "@/components/dashboard/EventListBlockSettings";
import {
  FaqBlockSettings,
  MapBlockSettings,
  PollBlockSettings,
} from "@/components/dashboard/InteractionBlockSettings";
import type { QuickCreateOption } from "@/types/profile-editor";

interface ProfileLinksManagerProps {
  blocks: ProfileBlock[];
  onBlocksChange: Dispatch<SetStateAction<ProfileBlock[]>>;
  openBlock: string | null;
  onOpenBlockChange: (id: string | null) => void;
  onOpenAddDrawer: () => void;
  onQuickCreate: (kind: QuickCreateOption["kind"]) => void;
}

/**
 * Beheer van de link-/componentenlijst: toevoegen, in-/uitschakelen, per-blok
 * instellingen en herordenen via drag-and-drop of pijltjesknoppen.
 */
export function ProfileLinksManager({
  blocks,
  onBlocksChange,
  openBlock,
  onOpenBlockChange,
  onOpenAddDrawer,
  onQuickCreate,
}: ProfileLinksManagerProps) {
  const dragId = useRef<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const patch = (id: string, next: Partial<ProfileBlock>) =>
    onBlocksChange((b) => b.map((x) => (x.id === id ? { ...x, ...next } : x)));

  /** Zet het blok bovenaan (of maakt het weer los). */
  const togglePin = (id: string) =>
    onBlocksChange((b) => {
      const target = b.find((x) => x.id === id);
      if (!target) return b;
      const next = b.map((x) => (x.id === id ? { ...x, pinned: !target.pinned } : x));
      if (target.pinned) return next;
      const moved = next.find((x) => x.id === id)!;
      return [moved, ...next.filter((x) => x.id !== id)];
    });

  /** Kleine miniatuur (max ~300 KB) als data-URL bij het blok bewaren. */
  const pickThumbnail = (id: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 300_000) {
        toast.error("Kies een afbeelding onder 300 KB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => patch(id, { thumbnailUrl: String(reader.result) });
      reader.readAsDataURL(file);
    };
    input.click();
  };

  /** Every reorder gets a floating Undo toast, one click back. */
  const reorderWithUndo = (mutate: (list: ProfileBlock[]) => ProfileBlock[]) => {
    onBlocksChange((b) => {
      const next = mutate(b);
      if (next === b) return b;
      const before = b;
      toast("Order changed", {
        action: { label: "Undo", onClick: () => onBlocksChange(before) },
      });
      return next;
    });
  };

  const move = (id: string, delta: number) =>
    reorderWithUndo((b) => {
      const from = b.findIndex((x) => x.id === id);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= b.length) return b;
      const next = [...b];
      next.splice(to, 0, next.splice(from, 1)[0]);
      return next;
    });

  const dropOn = (targetId: string) => {
    const from = dragId.current;
    dragId.current = null;
    setDragging(null);
    setDropTarget(null);
    if (!from || from === targetId) return;
    reorderWithUndo((b) => {
      const next = b.filter((x) => x.id !== from);
      const moved = b.find((x) => x.id === from);
      if (!moved) return b;
      next.splice(
        next.findIndex((x) => x.id === targetId),
        0,
        moved,
      );
      return next;
    });
  };

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Components</h2>
        <span className="text-[11px] text-muted-foreground">
          {blocks.filter((b) => !b.hidden).length} visible
        </span>
      </div>

      <button
        type="button"
        onClick={onOpenAddDrawer}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-sm font-medium text-background transition-opacity hover:opacity-90"
      >
        <Plus className="h-4 w-4" aria-hidden /> + Add component
      </button>

      <div className="flex flex-wrap gap-2">
        {QUICK_CREATE.map((q) => (
          <button
            key={q.kind}
            type="button"
            onClick={() => onQuickCreate(q.kind)}
            className="h-8 shrink-0 rounded-full border border-border px-3 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {q.label}
          </button>
        ))}
      </div>

      {blocks.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          No components yet — add your first social link, header, or custom URL.
        </p>
      )}

      <ul className="space-y-2">
        {blocks.map((b, index) => {
          const hint = inputHint(b.kind);
          const open = openBlock === b.id;
          return (
            <li
              key={b.id}
              draggable
              onDragStart={() => {
                dragId.current = b.id;
                setDragging(b.id);
              }}
              onDragEnd={() => {
                dragId.current = null;
                setDragging(null);
                setDropTarget(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragId.current && dragId.current !== b.id) setDropTarget(b.id);
              }}
              onDragLeave={() => setDropTarget((t) => (t === b.id ? null : t))}
              onDrop={() => dropOn(b.id)}
              className={cn(
                "relative overflow-hidden rounded-xl border bg-background p-3 transition-all",
                b.hidden ? "border-border opacity-60" : "border-border",
                dragging === b.id && "opacity-40",
                dropTarget === b.id &&
                  "before:absolute before:inset-x-2 before:-top-px before:h-0.5 before:rounded-full before:bg-primary",
              )}
              style={{ borderLeft: `4px solid ${brandOf(b.kind)}` }}
            >
              <div className="flex min-w-0 items-center gap-2">
                <GripVertical
                  className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground"
                  aria-hidden
                />
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40"
                  style={{ color: brandOf(b.kind) }}
                >
                  <SocialPlatformIcon
                    source={b.value?.trim() || b.kind}
                    className="h-4 w-4 text-current"
                  />
                </span>
                <button
                  type="button"
                  onClick={() => onOpenBlockChange(open ? null : b.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate text-sm font-medium">{b.label}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {b.value ? blockHref(b) : "Not filled in yet"}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={b.pinned ? "Losmaken" : "Vastzetten bovenaan"}
                  aria-pressed={Boolean(b.pinned)}
                  onClick={() => togglePin(b.id)}
                  className={cn(
                    "shrink-0 rounded-lg p-1 transition-colors hover:bg-muted",
                    b.pinned ? "text-amber-500" : "text-muted-foreground",
                  )}
                >
                  <Pin className="h-4 w-4" />
                </button>
                <Switch
                  checked={!b.hidden}
                  onCheckedChange={(on) => patch(b.id, { hidden: !on })}
                  aria-label={b.hidden ? "Show component" : "Hide component"}
                  className="shrink-0 data-[state=checked]:bg-emerald-500"
                />
                <button
                  type="button"
                  aria-label="Settings"
                  onClick={() => onOpenBlockChange(open ? null : b.id)}
                  className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-muted"
                >
                  <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
                </button>
              </div>

              {open && (
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  {b.kind === "media_gallery" ? (
                    <GalleryBlockSettings
                      value={b.value}
                      onChange={(value) => patch(b.id, { value })}
                      onTitle={(label) => patch(b.id, { label })}
                    />
                  ) : b.kind === "media_embed" ? (
                    <MediaEmbedBlockSettings
                      value={b.value}
                      onChange={(value) => patch(b.id, { value })}
                      onTitle={(label) => patch(b.id, { label })}
                    />
                  ) : b.kind === "booking_request" ? (
                    <BookingBlockSettings
                      value={b.value}
                      onChange={(value) => patch(b.id, { value })}
                      onTitle={(label) => patch(b.id, { label })}
                    />
                  ) : b.kind === "contact_form" ? (
                    <ContactFormBlockSettings
                      value={b.value}
                      onChange={(value) => patch(b.id, { value })}
                      onTitle={(label) => patch(b.id, { label })}
                    />
                  ) : b.kind === "event_list" ? (
                    <EventListBlockSettings
                      value={b.value}
                      onChange={(value) => patch(b.id, { value })}
                      onTitle={(label) => patch(b.id, { label })}
                    />
                  ) : b.kind === "live_poll" ? (
                    <PollBlockSettings
                      value={b.value}
                      onChange={(value) => patch(b.id, { value })}
                      onTitle={(label) => patch(b.id, { label })}
                    />
                  ) : b.kind === "faq_accordion" ? (
                    <FaqBlockSettings
                      value={b.value}
                      onChange={(value) => patch(b.id, { value })}
                      onTitle={(label) => patch(b.id, { label })}
                    />
                  ) : b.kind === "map_embed" ? (
                    <MapBlockSettings
                      value={b.value}
                      onChange={(value) => patch(b.id, { value })}
                      onTitle={(label) => patch(b.id, { label })}
                    />
                  ) : isHandleBlock(b.kind) && b.kind !== "matrix" ? (
                    <>
                      <SocialHandleInput
                        kind={b.kind}
                        label={b.label}
                        value={b.value}
                        onChange={(handle) => patch(b.id, { value: handle })}
                        placeholder={
                          BLOCK_KINDS.find((k) => k.kind === b.kind)?.placeholder?.replace(
                            /^@/,
                            "",
                          ) ?? "username"
                        }
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Enter just your handle — paste a full link and we extract the username
                        automatically.
                      </p>
                    </>
                  ) : (
                    <>
                      <Input
                        className="input-field h-11 rounded-xl"
                        placeholder={BLOCK_KINDS.find((k) => k.kind === b.kind)?.placeholder}
                        value={b.value}
                        maxLength={400}
                        onChange={(e) => patch(b.id, { value: e.target.value })}
                        onBlur={(e) => patch(b.id, { value: sanitizeUrl(e.target.value) })}
                      />
                      <p className="text-[11px] text-muted-foreground">
                        {hint.prefix && (
                          <span className="mr-1 font-mono text-foreground">{hint.prefix}</span>
                        )}
                        {hint.help}
                      </p>
                    </>
                  )}
                  {isPromoBlock(b.kind) && (
                    <div className="space-y-2 rounded-xl border border-border/60 bg-background p-3">
                      <p className="text-[11px] font-medium text-foreground">Promo-instellingen</p>
                      <div className="flex flex-wrap gap-1.5">
                        {PROMO_BADGE_PRESETS.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => patch(b.id, { badge: preset })}
                            className="rounded-full border border-border px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                      <Input
                        className="input-field h-9 rounded-xl"
                        placeholder="Badge (bijv. 🔥 NIEUW)"
                        maxLength={32}
                        value={b.badge ?? ""}
                        onChange={(e) => patch(b.id, { badge: e.target.value })}
                      />
                      <Input
                        type="datetime-local"
                        className="input-field h-9 rounded-xl"
                        aria-label="Actie loopt tot"
                        value={(b.expiresAt ?? "").slice(0, 16)}
                        onChange={(e) =>
                          patch(b.id, {
                            expiresAt: e.target.value
                              ? new Date(e.target.value).toISOString()
                              : "",
                          })
                        }
                      />
                      <div className="flex flex-wrap gap-1.5">
                        {PROMO_COPY_PRESETS.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => patch(b.id, { label: preset })}
                            className="rounded-full border border-dashed border-border px-2 py-1 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="space-y-2 rounded-xl border border-border/60 bg-background p-3">
                    <p className="text-[11px] font-medium text-foreground">Planning & weergave</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="space-y-1 text-[10px] text-muted-foreground">
                        Zichtbaar vanaf
                        <Input
                          type="datetime-local"
                          className="input-field h-9 rounded-xl"
                          value={(b.startsAt ?? "").slice(0, 16)}
                          onChange={(e) =>
                            patch(b.id, {
                              startsAt: e.target.value
                                ? new Date(e.target.value).toISOString()
                                : "",
                            })
                          }
                        />
                      </label>
                      <label className="space-y-1 text-[10px] text-muted-foreground">
                        Zichtbaar tot
                        <Input
                          type="datetime-local"
                          className="input-field h-9 rounded-xl"
                          value={(b.expiresAt ?? "").slice(0, 16)}
                          onChange={(e) =>
                            patch(b.id, {
                              expiresAt: e.target.value
                                ? new Date(e.target.value).toISOString()
                                : "",
                            })
                          }
                        />
                      </label>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {b.thumbnailUrl && (
                        <img
                          src={b.thumbnailUrl}
                          alt=""
                          className="h-8 w-8 rounded-md border border-border object-cover"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => pickThumbnail(b.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] hover:bg-muted"
                      >
                        <ImagePlus className="h-3.5 w-3.5" /> Eigen miniatuur
                      </button>
                      {b.thumbnailUrl && (
                        <button
                          type="button"
                          onClick={() => patch(b.id, { thumbnailUrl: "" })}
                          className="rounded-lg px-2 py-1 text-[11px] text-muted-foreground hover:text-destructive"
                        >
                          Verwijderen
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Move up"
                      disabled={index === 0}
                      onClick={() => move(b.id, -1)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Move down"
                      disabled={index === blocks.length - 1}
                      onClick={() => move(b.id, 1)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onBlocksChange((x) => x.filter((y) => y.id !== b.id))}
                      className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
