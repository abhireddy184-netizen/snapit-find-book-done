import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { attachSupabaseAuth } from "./integrations/supabase/auth-attacher";
import { renderErrorPage } from "./lib/error-page";


const errorMiddleware = createMiddleware().server(async ({ next, request }) => {
  if (new URL(request.url).pathname.startsWith("/lovable/")) {
    return next();
  }
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Security headers for SSR HTML responses, production only.
//
// TanStack Start's SSR output includes inline hydration <script> tags (and
// __root.tsx may inline a theme-setting script), so a strict, *enforced*
// Content-Security-Policy with a locked-down `script-src`/`default-src`
// would break hydration and theming. To get CSP visibility without
// breaking the app, we split the policy in two:
//   - `Content-Security-Policy` enforces only `frame-ancestors 'none'`,
//     which is safe to always enforce (it only blocks framing of our own
//     pages and has no effect on inline scripts/styles).
//   - `Content-Security-Policy-Report-Only` carries the full intended
//     policy so it can be observed/reported without blocking anything,
//     until the app's inline scripts are removed/nonced and the full
//     policy can be safely enforced.
// `X-Frame-Options: DENY` is always sent as a legacy fallback for
// `frame-ancestors 'none'` in browsers that don't support CSP.
const REPORT_ONLY_CSP =
  "frame-ancestors 'none'; default-src 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com; script-src 'self' https://js.stripe.com; frame-src https://js.stripe.com https://hooks.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob: https:";

const securityHeadersMiddleware = createMiddleware().server(async ({ next }) => {
  const result = await next();
  if (import.meta.env.PROD) {
    const response = "response" in result ? result.response : (result as unknown as Response);
    if (response instanceof Response) {
      response.headers.set("X-Frame-Options", "DENY");
      response.headers.set("Content-Security-Policy", "frame-ancestors 'none'");
      response.headers.set("Content-Security-Policy-Report-Only", REPORT_ONLY_CSP);
    }
  }
  return result;
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware, securityHeadersMiddleware, csrfMiddleware],
  functionMiddleware: [attachSupabaseAuth],
}));
