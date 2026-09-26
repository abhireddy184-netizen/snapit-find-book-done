import { QueryClient } from "@tanstack/react-query";
import { createRouter, parseSearchWith, stringifySearchWith } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// Keep plain strings plain in the URL (e.g. `loc=90210`, not `loc=%2290210%22`).
const stringifyValue = (v: unknown) => (typeof v === "string" ? v : JSON.stringify(v));
const parseValue = (v: string) => {
  if (/^[[{"]/.test(v)) {
    try { return JSON.parse(v); } catch { return v; }
  }
  if (v === "true") return true;
  if (v === "false") return false;
  return v;
};

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    parseSearch: parseSearchWith(parseValue),
    stringifySearch: stringifySearchWith(stringifyValue, parseValue),
  });

  return router;
};
