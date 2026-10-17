import { createFileRoute } from "@tanstack/react-router";
import { ProSignup } from "@/components/getpros/ProSignup";

export const Route = createFileRoute("/provider-interest")({
  head: () => ({
    meta: [
      { title: "Grow your business with GetPros — GetPros.ai" },
      { name: "description", content: "Join GetPros as a Pro in 30 seconds. Free to join, set your own prices and choose when you work." },
      { property: "og:title", content: "Grow your business with GetPros — GetPros.ai" },
      { property: "og:description", content: "Join GetPros as a Pro in 30 seconds. Free to join, set your own prices and choose when you work." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Grow your business with GetPros — GetPros.ai" },
      { name: "twitter:description", content: "Join GetPros as a Pro in 30 seconds. Free to join, set your own prices and choose when you work." },
    ],
  }),
  component: ProSignup,
});

