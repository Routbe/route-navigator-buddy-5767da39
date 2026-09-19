import type { CSSProperties } from "react";
import { CalendarPlus, MapPin } from "lucide-react";

import {
  eventDateBadge,
  eventGoogleUrl,
  eventIcsDataUrl,
  visibleEvents,
  type EventListConfig,
} from "@/lib/events";

/** Publieke agenda: datumbadge, locatie, ticketknop en kalender-pill. */
export function EventListCard({
  config,
  style,
}: {
  config: EventListConfig;
  style?: CSSProperties;
}) {
  const events = visibleEvents(config);
  if (!events.length) return null;

  return (
    <div
      className="w-full overflow-hidden rounded-2xl border border-zinc-200/80 p-4 text-left shadow-sm"
      style={style}
    >
      {config.title && <p className="text-sm font-semibold">{config.title}</p>}
      <ul className="mt-3 space-y-3">
        {events.map((event, i) => {
          const badge = eventDateBadge(event.date);
          return (
            <li key={`${event.date}-${i}`} className="flex gap-3">
              <span className="flex h-14 w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-border">
                <span className="text-[10px] font-semibold uppercase opacity-70">
                  {badge.month}
                </span>
                <span className="text-lg font-semibold leading-none">{badge.day}</span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{event.title}</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs opacity-70">
                  {event.time}
                  {event.venue && (
                    <>
                      <MapPin className="ml-1 h-3 w-3 shrink-0" aria-hidden />
                      <span className="truncate">{event.venue}</span>
                    </>
                  )}
                </p>
                {event.description && (
                  <p className="mt-1 text-xs opacity-70">{event.description}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {event.url && (
                    <a
                      href={event.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-opacity hover:opacity-90"
                    >
                      {event.buttonLabel || "Tickets"}
                    </a>
                  )}
                  <a
                    href={eventIcsDataUrl(event)}
                    download={`${event.title.replace(/[^\w-]+/g, "-").toLowerCase()}.ics`}
                    className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                  >
                    <CalendarPlus className="h-3 w-3" aria-hidden />
                    Agenda
                  </a>
                  <a
                    href={eventGoogleUrl(event)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                  >
                    Google
                  </a>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
