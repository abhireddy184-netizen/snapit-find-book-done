import { createServerFn } from "@tanstack/react-start";

export const subscribeToUpdates = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; source?: string }) => ({
    email: String(input?.email ?? ""),
    source: input?.source ? String(input.source) : "website_footer",
  }))
  .handler(async ({ data }) => {
    const { subscribeEmail } = await import("./subscribe.server");
    return subscribeEmail(data.email, data.source);
  });

export const unsubscribeFromUpdates = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string }) => ({ token: String(input?.token ?? "") }))
  .handler(async ({ data }) => {
    const { unsubscribeByToken } = await import("./subscribe.server");
    return { result: await unsubscribeByToken(data.token) };
  });
