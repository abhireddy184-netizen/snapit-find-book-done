import { createFileRoute, redirect } from "@tanstack/react-router";

/** /admin has nothing of its own yet — send admins straight to the pro approval queue. */
export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/providers" });
  },
});
