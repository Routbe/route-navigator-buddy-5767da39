import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/middleware";

/** Adminlijst met fysieke cadeaubon-zendingen (België). */
export const listGiftShipments = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: unknown) =>
    z.object({ openOnly: z.boolean().default(true) }).parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { assertAdminRole } = await import("./admin.server");
    await assertAdminRole(context.userId);
    const { fetchGiftShipments } = await import("./admin-gift-cards.server");
    return fetchGiftShipments(data.openOnly);
  });

/** Zet een zending op pending_print / packaged / shipped. */
export const setGiftShipmentStatus = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        giftId: z.string().uuid(),
        status: z.enum(["pending_print", "packaged", "shipped"]),
        trackingCode: z.string().max(64).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { assertAdminRole } = await import("./admin.server");
    await assertAdminRole(context.userId);
    const { updateGiftShipment } = await import("./admin-gift-cards.server");
    return updateGiftShipment({
      giftId: data.giftId,
      status: data.status,
      trackingCode: data.trackingCode ?? null,
    });
  });
