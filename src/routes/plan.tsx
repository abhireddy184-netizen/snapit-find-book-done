import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Services-only launch: the general day-planner is deferred. `/plan` stays a
 * valid URL (old links, bookmarks, shared plans) but it no longer renders the
 * deprecated planner — it forwards the person's own words straight into the
 * service request flow so nothing they typed or said is dropped.
 *
 * The planner UI itself is preserved, unlinked, in `src/legacy/PlanPage.tsx`.
 */
type PlanSearch = { q: string; loc: string; demo?: boolean };

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" && Number.isInteger(v) && v >= 0 && v < 100000) {
    return String(v).padStart(5, "0");
  }
  return v == null ? "" : String(v);
}

export const Route = createFileRoute("/plan")({
  validateSearch: (search: Record<string, unknown>): PlanSearch => ({
    ...(search["demo"] ? { demo: true } : {}),
    q: asString(search["q"]),
    loc: asString(search["loc"]),
  }),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/snap",
      search: { q: search.q ?? "", loc: search.loc ?? "" },
      replace: true,
    });
  },
});
