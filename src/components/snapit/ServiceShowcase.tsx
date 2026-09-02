import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import plumbing from "@/assets/scenes/plumbing.jpg";
import electrical from "@/assets/scenes/electrical.jpg";
import cleaning from "@/assets/scenes/cleaning.jpg";
import hvac from "@/assets/scenes/hvac.jpg";
import handyman from "@/assets/scenes/handyman.jpg";
import appliances from "@/assets/scenes/appliances.jpg";
import beauty from "@/assets/scenes/hair.jpg";
import auto from "@/assets/scenes/auto-mobile.jpg";
import moving from "@/assets/scenes/moving.jpg";
import lawn from "@/assets/scenes/lawn.jpg";

type Tile = { slug: string; name: string; line: string; img: string };

const TILES: Tile[] = [
  { slug: "plumbing", name: "Plumbing", line: "Leaks, drains, fixtures", img: plumbing },
  { slug: "electrical", name: "Electrical", line: "Outlets, lights, panels", img: electrical },
  { slug: "cleaning", name: "House Cleaning", line: "Standard to deep clean", img: cleaning },
  { slug: "hvac", name: "AC / HVAC", line: "Repairs and tune-ups", img: hvac },
  { slug: "handyman", name: "Handyman", line: "Your punch list, done", img: handyman },
  { slug: "appliances", name: "Appliance Repair", line: "Fridge, washer, oven", img: appliances },
  { slug: "beauty-at-home", name: "Beauty at Home", line: "Salon-quality, at home", img: beauty },
  { slug: "auto-mobile", name: "Auto Services", line: "They come to you", img: auto },
  { slug: "moving", name: "Moving", line: "Pack, lift, deliver", img: moving },
  { slug: "lawn-outdoor", name: "Lawn Care", line: "Mow, trim, clean up", img: lawn },
];

function Card({ tile }: { tile: Tile }) {
  return (
    <Link
      to="/services/$category"
      params={{ category: tile.slug }}
      className="group w-[62%] shrink-0 snap-start overflow-hidden surface-card transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card min-[430px]:w-[54%] sm:w-auto"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        <img
          src={tile.img}
          alt={`${tile.name} professional at work`}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <div className="min-w-0 p-3">
        <div className="truncate text-sm font-black tracking-tight text-foreground">{tile.name}</div>
        <div className="truncate text-xs text-muted-foreground">{tile.line}</div>
      </div>
    </Link>
  );
}

export function ServiceShowcase() {
  return (
    <section className="mt-10 sm:mt-12">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
        <h2 className="min-w-0 text-[clamp(1.35rem,3vw,2rem)] font-black leading-tight tracking-tight">
          Browse services
        </h2>
        <Link to="/services" className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-primary hover:underline">
          See all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="gpb-edge-md mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-5">
        {TILES.map((t) => (
          <Card key={t.slug} tile={t} />
        ))}
      </div>
    </section>
  );
}
