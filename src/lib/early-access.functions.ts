import { createServerFn } from "@tanstack/react-start";

export const submitEarlyAccess = createServerFn({ method: "POST" })
  .inputValidator((input: {
    fullName: string;
    email: string;
    location: string;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    serviceInterest: string;
  }) => ({
    fullName: String(input?.fullName ?? "").trim().slice(0, 120),
    email: String(input?.email ?? "").trim().slice(0, 255),
    location: String(input?.location ?? "").trim().slice(0, 160),
    city: input?.city ? String(input.city).slice(0, 120) : null,
    state: input?.state ? String(input.state).slice(0, 2) : null,
    zip: input?.zip && /^\d{5}$/.test(String(input.zip)) ? String(input.zip) : null,
    serviceInterest: String(input?.serviceInterest ?? "").slice(0, 160),
  }))
  .handler(async ({ data }) => {
    const { saveEarlyAccess } = await import("./early-access.server");
    return saveEarlyAccess(data);
  });
