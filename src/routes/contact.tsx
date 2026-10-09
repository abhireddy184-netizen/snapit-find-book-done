import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/contact")({
  beforeLoad: () => {
    throw redirect({ to: "/legal", hash: "privacy" });
  },
  component: () => null,
});
