import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Layout for admin pages. Exact /admin redirects via admin.index.tsx. */
export const Route = createFileRoute("/_authenticated/admin")({
  component: () => <Outlet />,
});
