import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { AppShell } from "@/components/getpros/AppShell";
import { catalog, TOTAL_SERVICES } from "@/lib/catalog";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Browse services — GetPros" },
      { name: "description", content: "Browse every service category on GetPros, from plumbing to beauty and spa." },
      { property: "og:title", content: "Browse services — GetPros" },
      { property: "og:description", content: "Every GetPros service in one place." },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  return (
    <AppShell>
      <div className="pt-6">
        <h1 className="text-3xl font-black md:text-4xl">Service categories</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">{catalog.length} master categories covering {TOTAL_SERVICES} GetPros services. Pick a category to see every sub-service.</p>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {catalog.map((cat) => {
          const Icon = cat.icon;
          return (
            <div key={cat.slug} className="group surface-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-elevated">
              <div className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${cat.gradient} text-white shadow-card`}>
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold">{cat.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{cat.tagline}</p>
              <Link
                to="/services/$category"
                params={{ category: cat.slug }}
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                View {cat.services.length} services <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}