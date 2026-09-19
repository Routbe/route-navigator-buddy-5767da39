import { type Dispatch, type ReactNode, type SetStateAction, useState } from "react";
import { Plus } from "lucide-react";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ProfileLinksManager } from "@/components/dashboard/editor/ProfileLinksManager";
import { AddComponentModal } from "@/components/studio/AddComponentModal";
import { scheduledBlocks, type ProfileBlock } from "@/lib/profile";
import type { QuickCreateOption } from "@/types/profile-editor";

interface Props {
  blocks: ProfileBlock[];
  onBlocksChange: Dispatch<SetStateAction<ProfileBlock[]>>;
  openBlock: string | null;
  onOpenBlockChange: (id: string | null) => void;
  onOpenAddDrawer: () => void;
  onQuickCreate: (kind: QuickCreateOption["kind"]) => void;
  /** Voegt een blok van dit type toe en opent het meteen. */
  onAddKind: (kind: string) => void;
  /** Extra secties (referrals, QR, badges …) onder de linklijst. */
  children?: ReactNode;
}

/**
 * 🔗 Links & Inhoudscomponenten.
 *
 * Bundelt de sleepbare linklijst, de rijke componentbibliotheek en alle
 * bijhorende secties. Elke wijziging is meteen zichtbaar in de live preview.
 */
export function ProfileContentAccordion({
  blocks,
  onBlocksChange,
  openBlock,
  onOpenBlockChange,
  onOpenAddDrawer,
  onQuickCreate,
  onAddKind,
  children,
}: Props) {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const live = scheduledBlocks(blocks).length;

  return (
    <AccordionItem
      value="components_list"
      className="rounded-2xl border border-border bg-card px-4 sm:px-5"
    >
      <AccordionTrigger className="hover:no-underline">
        <span className="flex flex-1 items-center justify-between gap-3 pr-2">
          <span className="text-base font-medium">🔗 Links &amp; Inhoudscomponenten</span>
          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
            {live} zichtbaar
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent className="space-y-4 pb-5">
        <button
          type="button"
          onClick={() => setLibraryOpen(true)}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm font-medium transition-colors hover:bg-muted"
        >
          <Plus className="h-4 w-4" aria-hidden /> + Inhoudscomponent toevoegen
        </button>
        <AddComponentModal
          open={libraryOpen}
          onClose={() => setLibraryOpen(false)}
          onAdd={onAddKind}
        />

        <ProfileLinksManager
          blocks={blocks}
          onBlocksChange={onBlocksChange}
          openBlock={openBlock}
          onOpenBlockChange={onOpenBlockChange}
          onOpenAddDrawer={onOpenAddDrawer}
          onQuickCreate={onQuickCreate}
        />
        {children}
      </AccordionContent>
    </AccordionItem>
  );
}
