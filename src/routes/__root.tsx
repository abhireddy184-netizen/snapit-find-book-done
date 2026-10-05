import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useRouterState,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { SITE_URL } from "../lib/brand";

const OG_IMAGE = `${SITE_URL}/brand/og-getpros.jpg?v=gp7`;

/** Self-referencing canonical + og:url for whatever page is rendered (query/hash stripped). */
function CanonicalTags() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const path = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
  const href = `${SITE_URL}${path}`;
  return (
    <>
      <link rel="canonical" href={href} />
      <meta property="og:url" content={href} />
    </>
  );
}
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { ThemeProvider, themeInitScript } from "../lib/theme";
import { AuthProvider } from "../lib/auth";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "GetPros.ai — Show, Say or Type the Service You Need" },
      { name: "description", content: "Show a photo, a video or just describe it. GetPros.ai works out what you actually need, turns it into one clear job, and connects you with verified local professionals across home, beauty and personal care." },
      { name: "keywords", content: "AI local services, AI home services, plumber near me, electrician near me, handyman, HVAC, cleaning services, lawn care, appliance repair, beauty services, home maintenance, AI marketplace, on-demand services, GetPros" },
      { name: "author", content: "GetPros" },
      { property: "og:site_name", content: "GetPros.ai" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      // Sitewide GetPros share image (owner request) — pages may override.
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:image", content: OG_IMAGE },
      { property: "og:title", content: "GetPros.ai — Show, Say or Type the Service You Need" },
      { name: "twitter:title", content: "GetPros.ai — Show, Say or Type the Service You Need" },
      { name: "application-name", content: "GetPros.ai" },
      { name: "apple-mobile-web-app-title", content: "GetPros.ai" },
      { name: "theme-color", content: "#0b1f3a" },
      { property: "og:description", content: "Show a photo, a video or just describe it. GetPros.ai works out what you actually need, turns it into one clear job, and connects you with verified local professionals across home, beauty and personal care." },
      { name: "twitter:description", content: "Show a photo, a video or just describe it. GetPros.ai works out what you actually need, turns it into one clear job, and connects you with verified local professionals across home, beauty and personal care." },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@700;800&family=Noto+Sans+Telugu:wght@400;500;700&family=Noto+Sans+Devanagari:wght@400;500;700&family=Noto+Sans+Tamil:wght@400;500;700&family=Noto+Sans+Arabic:wght@400;500;700&display=swap",
      },
      { rel: "icon", href: "/favicon.ico?v=gp7", sizes: "any" },
      { rel: "shortcut icon", href: "/favicon.ico?v=gp7" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png?v=gp7" },
      { rel: "icon", type: "image/png", sizes: "96x96", href: "/favicon-96.png?v=gp7" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png?v=gp7" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png?v=gp7" },
      { rel: "manifest", href: "/site.webmanifest?v=gp7" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <HeadContent />
        <CanonicalTags />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
