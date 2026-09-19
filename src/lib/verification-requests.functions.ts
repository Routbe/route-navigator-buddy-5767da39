import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/middleware";

/**
 * Server-functies voor bedrijfs- en influencerverificatie.
 * De aanvraag van een lid en de wachtrij voor beheerders.
 */

const businessSchema = z.object({
  companyName: z.string().min(2).max(160),
  legalForm: z.string().max(80).nullable().optional(),
  vatNumber: z.string().min(6).max(20),
  address: z.string().max(240).nullable().optional(),
  country: z.string().max(2).nullable().optional(),
  websiteDomain: z.string().min(4).max(120),
  contactName: z.string().max(120).nullable().optional(),
  contactEmail: z.string().email().max(160).nullable().optional(),
});

export const requestBusinessVerification = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: unknown) => businessSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { submitBusinessRequest } = await import("./verification-requests.server");
    return submitBusinessRequest(context.userId, data);
  });

export const getMyBusinessRequest = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { myBusinessRequest } = await import("./verification-requests.server");
    return myBusinessRequest(context.userId);
  });

const influencerSchema = z.object({
  handleChoices: z.array(z.string().max(40)).min(1).max(4),
  socialLinks: z.array(z.string().max(200)).min(1).max(8),
  motivation: z.string().max(600).nullable().optional(),
});

export const requestInfluencerVerification = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: unknown) => influencerSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { submitInfluencerRequest } = await import("./verification-requests.server");
    return submitInfluencerRequest(context.userId, data);
  });

export const getMyInfluencerRequest = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { myInfluencerRequest } = await import("./verification-requests.server");
    return myInfluencerRequest(context.userId);
  });

/* ─────────────────────────── beheer ─────────────────────────── */

const statusInput = z.object({ status: z.string().max(24).optional() });

export const adminListBusinessRequests = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: unknown) => statusInput.parse(data ?? {}))
  .handler(async ({ data, context }) => {
    const { assertAdminRole } = await import("./admin.server");
    await assertAdminRole(context.userId);
    const { listBusinessRequests } = await import("./verification-requests.server");
    return listBusinessRequests(data.status ?? "pending");
  });

export const adminListInfluencerRequests = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: unknown) => statusInput.parse(data ?? {}))
  .handler(async ({ data, context }) => {
    const { assertAdminRole } = await import("./admin.server");
    await assertAdminRole(context.userId);
    const { listInfluencerRequests } = await import("./verification-requests.server");
    return listInfluencerRequests(data.status ?? "pending");
  });

const reviewInput = z.object({
  requestId: z.string().uuid(),
  approve: z.boolean(),
  handle: z.string().max(60).nullable().optional(),
  note: z.string().max(400).nullable().optional(),
});

export const adminReviewBusinessRequest = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: unknown) => reviewInput.parse(data))
  .handler(async ({ data, context }) => {
    const { assertAdminRole } = await import("./admin.server");
    await assertAdminRole(context.userId);
    const { approveBusinessRequest, rejectBusinessRequest } = await import(
      "./verification-requests.server"
    );
    return data.approve
      ? approveBusinessRequest(data.requestId, context.userId)
      : rejectBusinessRequest(data.requestId, context.userId, data.note ?? null);
  });

export const adminReviewInfluencerRequest = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: unknown) => reviewInput.parse(data))
  .handler(async ({ data, context }) => {
    const { assertAdminRole } = await import("./admin.server");
    await assertAdminRole(context.userId);
    const { approveInfluencerRequest, rejectInfluencerRequest } = await import(
      "./verification-requests.server"
    );
    return data.approve
      ? approveInfluencerRequest(data.requestId, context.userId, data.handle ?? null)
      : rejectInfluencerRequest(data.requestId, context.userId, data.note ?? null);
  });
