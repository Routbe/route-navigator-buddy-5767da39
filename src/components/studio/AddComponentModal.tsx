import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BLOCK_KINDS } from "@/lib/profile";

/** Eén rijke component uit de bibliotheek. */
interface LibraryItem {
  kind: string;
  label: string;
  note: string;
}

interface LibraryGroup {
  id: string;
  title: string;
  items: LibraryItem[];
}

/**
 * Curated bibliotheek: de zes groepen die makers het vaakst nodig hebben.
 * Elke `kind` bestaat al in `BLOCK_KINDS`, dus toevoegen werkt meteen.
 */
export const COMPONENT_LIBRARY: LibraryGroup[] = [
  {
    id: "media",
    title: "🎵 Media embeds",
    items: [
      { kind: "spotify", label: "Spotify", note: "Album, playlist of artiestenpagina" },
      { kind: "youtube", label: "YouTube", note: "Video of kanaal" },
      { kind: "applemusic", label: "Apple Music", note: "Album of playlist" },
      { kind: "soundcloud", label: "Soundcloud", note: "Track of profiel" },
      { kind: "media_embed", label: "Universele speler", note: "Plak elke embed-link" },
    ],
  },
  {
    id: "vcard",
    title: "🎴 vCard contactkaart",
    items: [
      { kind: "vcard", label: "Toevoegen aan contacten", note: "Eén tik → in de telefoon" },
    ],
  },
  {
    id: "form",
    title: "📝 Contactformulier",
    items: [
      { kind: "contact_form", label: "Direct bericht", note: "Komt in je mailbox terecht" },
    ],
  },
  {
    id: "booking",
    title: "📅 Boeking & agenda",
    items: [
      { kind: "booking_request", label: "Boekingsaanvraag", note: "Kalender met tijdslots" },
      { kind: "calcom", label: "Cal.com", note: "Externe agenda" },
      { kind: "calendly", label: "Calendly", note: "Externe agenda" },
    ],
  },
  {
    id: "tip",
    title: "☕ Tip jar & donatie",
    items: [
      { kind: "kofi", label: "Ko-fi", note: "Steun met een kleine bijdrage" },
      { kind: "bmac", label: "Buy Me a Coffee", note: "Steunknop" },
      { kind: "stripe", label: "Stripe", note: "Betaallink" },
      { kind: "opencollective", label: "Open Collective", note: "Transparant doneren" },
    ],
  },
  {
    id: "text",
    title: "📄 Tekst & aankondiging",
    items: [
      { kind: "text", label: "Tekstblok", note: "Korte aankondiging of intro" },
      { kind: "promo", label: "Promo-blok", note: "Badge + aftelklok" },
      { kind: "faq_accordion", label: "FAQ", note: "Vragen en antwoorden" },
    ],
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (kind: string) => void;
}

/** Modale bibliotheek met rijke inhoudscomponenten. */
export function AddComponentModal({ open, onClose, onAdd }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Inhoudscomponent toevoegen</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {COMPONENT_LIBRARY.map((group) => (
            <section key={group.id} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.title}
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {group.items
                  .filter((item) => BLOCK_KINDS.some((k) => k.kind === item.kind))
                  .map((item) => (
                    <button
                      key={item.kind}
                      type="button"
                      onClick={() => {
                        onAdd(item.kind);
                        onClose();
                      }}
                      className="rounded-xl border border-border bg-background p-3 text-left transition-colors hover:bg-muted"
                    >
                      <span className="block text-sm font-medium">{item.label}</span>
                      <span className="block text-[11px] text-muted-foreground">{item.note}</span>
                    </button>
                  ))}
              </div>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
