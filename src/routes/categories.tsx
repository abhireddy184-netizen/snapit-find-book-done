import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { AppShell } from "@/components/snapit/AppShell";
import { categories } from "@/lib/snapit-data";
import { Footer } from "./index";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Browse services — SnapIt" },
      { name: "description", content: "Browse every service category on SnapIt, from plumbing to beauty and spa." },
      { property: "og:title", content: "Browse services — SnapIt" },
      { property: "og:description", content: "Every SnapIt service in one place." },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  return (
    <AppShell>
      <div className="pt-6">
        <h1 className="text-3xl font-black md:text-4xl">All services</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">Pick a category to see trusted pros in your area.</p>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <div key={cat.slug} className="group rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <div className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${cat.color} text-white shadow-md`}>
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold">{cat.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{cat.description}</p>
              <Link
                to="/search"
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                View Providers <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          );
        })}
      </div>
      <Footer />
    </AppShell>
  );
}