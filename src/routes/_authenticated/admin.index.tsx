import { createFileRoute, redirect } from "@tanstack/react-router";

/** Exact /admin has nothing of its own yet — send admins to the pro approval queue. */
export const Route = createFileRoute("/_authenticated/admin/")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/providers" });
  },
});
