import type { LucideIcon } from "lucide-react";
import {
  Wrench,
  Zap,
  Wind,
  Sparkles,
  Hammer,
  Trees,
  Refrigerator,
  Scissors,
  Truck,
  Car,
} from "lucide-react";

export type Category = {
  slug: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
};

export const categories: Category[] = [
  { slug: "plumbing", name: "Plumbing", description: "Leaks, drains, water heaters and installs.", icon: Wrench, color: "from-blue-500 to-indigo-500" },
  { slug: "electrical", name: "Electrical", description: "Wiring, outlets, lighting and safety checks.", icon: Zap, color: "from-amber-500 to-orange-500" },
  { slug: "hvac", name: "HVAC", description: "Heating, cooling, tune-ups and repair.", icon: Wind, color: "from-cyan-500 to-sky-500" },
  { slug: "house-cleaning", name: "House Cleaning", description: "Deep cleans, recurring and move-outs.", icon: Sparkles, color: "from-fuchsia-500 to-purple-500" },
  { slug: "handyman", name: "Handyman", description: "Small repairs, mounting and assembly.", icon: Hammer, color: "from-rose-500 to-red-500" },
  { slug: "lawn-care", name: "Lawn Care", description: "Mowing, trimming and yard cleanups.", icon: Trees, color: "from-emerald-500 to-green-500" },
  { slug: "appliance-repair", name: "Appliance Repair", description: "Fridge, washer, dryer and dishwasher fixes.", icon: Refrigerator, color: "from-slate-500 to-zinc-600" },
  { slug: "beauty-spa", name: "Beauty & Spa", description: "In-home beauty, massage and wellness.", icon: Scissors, color: "from-pink-500 to-rose-500" },
  { slug: "moving-help", name: "Moving Help", description: "Loaders, movers and packing pros.", icon: Truck, color: "from-violet-500 to-purple-600" },
  { slug: "auto-services", name: "Auto Services", description: "Mobile mechanics and detailing.", icon: Car, color: "from-indigo-500 to-blue-600" },
];

export type Provider = {
  id: string;
  name: string;
  business: string;
  category: string;
  verified: boolean;
  rating: number;
  reviews: number;
  startingPrice: number;
  distance: number;
  availability: string;
  description: string;
  bio: string;
  serviceArea: string;
  initials: string;
  gradient: string;
  services: { name: string; price: string }[];
  photos: string[];
  reviewList: { name: string; rating: number; date: string; text: string }[];
};

const gradients = [
  "from-blue-500 to-purple-600",
  "from-indigo-500 to-violet-600",
  "from-purple-500 to-pink-500",
  "from-sky-500 to-blue-600",
  "from-violet-500 to-indigo-600",
  "from-fuchsia-500 to-purple-600",
];

export const providers: Provider[] = [
  {
    id: "marcus-r",
    name: "Marcus Rivera",
    business: "Rivera Plumbing Co.",
    category: "plumbing",
    verified: true,
    rating: 4.9,
    reviews: 328,
    startingPrice: 79,
    distance: 1.2,
    availability: "Today",
    description: "Licensed master plumber. 15 years of leak, drain and water heater expertise.",
    bio: "Family-owned plumbing service serving the greater metro area. Fully licensed, insured and background-checked. We show up on time and treat your home like our own.",
    serviceArea: "Within 15 miles of downtown",
    initials: "MR",
    gradient: gradients[0],
    services: [
      { name: "Leak diagnosis", price: "$79" },
      { name: "Drain unclog", price: "$129" },
      { name: "Water heater install", price: "$450+" },
      { name: "Toilet repair", price: "$95" },
    ],
    photos: [gradients[0], gradients[3], gradients[1], gradients[4]],
    reviewList: [
      { name: "Sarah K.", rating: 5, date: "2 days ago", text: "Marcus was fast, kind and fixed a leak two other plumbers missed." },
      { name: "Devon P.", rating: 5, date: "1 week ago", text: "Clear pricing, showed up early. Highly recommend." },
      { name: "Amelia T.", rating: 4, date: "3 weeks ago", text: "Great work, a bit pricey but worth it." },
    ],
  },
  {
    id: "elena-s",
    name: "Elena Sato",
    business: "Bright Spark Electric",
    category: "electrical",
    verified: true,
    rating: 5.0,
    reviews: 214,
    startingPrice: 89,
    distance: 2.4,
    availability: "Tomorrow",
    description: "Certified electrician specializing in smart home wiring and panel upgrades.",
    bio: "Certified electrician with a decade of residential and light commercial experience. Smart-home ready and code-perfect every time.",
    serviceArea: "Metro area + suburbs",
    initials: "ES",
    gradient: gradients[1],
    services: [
      { name: "Outlet install", price: "$89" },
      { name: "Light fixture", price: "$120" },
      { name: "Panel upgrade", price: "$1,200+" },
      { name: "EV charger install", price: "$650" },
    ],
    photos: [gradients[1], gradients[2], gradients[5], gradients[0]],
    reviewList: [
      { name: "Jordan L.", rating: 5, date: "4 days ago", text: "Elena is amazing. Explained everything and cleaned up perfectly." },
      { name: "Priya N.", rating: 5, date: "2 weeks ago", text: "Best electrician I've ever hired." },
    ],
  },
  {
    id: "carla-w",
    name: "Carla Weiss",
    business: "Sparkle Home Cleaning",
    category: "house-cleaning",
    verified: true,
    rating: 4.8,
    reviews: 512,
    startingPrice: 99,
    distance: 0.8,
    availability: "Today",
    description: "Deep cleans, recurring visits and move-out specialists. Eco-friendly products.",
    bio: "Sparkle sends fully insured 2-person teams with eco-friendly supplies. Same team every visit for recurring clients.",
    serviceArea: "Within 10 miles",
    initials: "CW",
    gradient: gradients[2],
    services: [
      { name: "Standard clean (2br)", price: "$99" },
      { name: "Deep clean", price: "$189" },
      { name: "Move-out clean", price: "$249" },
      { name: "Recurring weekly", price: "$79/visit" },
    ],
    photos: [gradients[2], gradients[4], gradients[0], gradients[3]],
    reviewList: [
      { name: "Nate J.", rating: 5, date: "Yesterday", text: "Our place has never looked this good." },
      { name: "Mira O.", rating: 5, date: "1 week ago", text: "Reliable, thorough, kind team." },
    ],
  },
  {
    id: "aaron-b",
    name: "Aaron Baker",
    business: "Baker Handyman Services",
    category: "handyman",
    verified: true,
    rating: 4.7,
    reviews: 187,
    startingPrice: 65,
    distance: 3.1,
    availability: "This week",
    description: "TV mounting, furniture assembly, drywall repair and everything in between.",
    bio: "One call for all the small stuff. If you have a list, I'll knock it out in a single visit.",
    serviceArea: "20 mile radius",
    initials: "AB",
    gradient: gradients[3],
    services: [
      { name: "TV mount", price: "$95" },
      { name: "Furniture assembly", price: "$65" },
      { name: "Drywall patch", price: "$120" },
      { name: "General handyman/hr", price: "$85/hr" },
    ],
    photos: [gradients[3], gradients[0], gradients[2], gradients[1]],
    reviewList: [
      { name: "Kai R.", rating: 5, date: "3 days ago", text: "Knocked out 6 items on my honey-do list in 2 hours." },
    ],
  },
  {
    id: "hvac-pros",
    name: "Diana Ortiz",
    business: "ClimateCare HVAC",
    category: "hvac",
    verified: true,
    rating: 4.9,
    reviews: 402,
    startingPrice: 119,
    distance: 4.5,
    availability: "Tomorrow",
    description: "AC tune-ups, heater repair and full system installs.",
    bio: "NATE-certified technicians, upfront pricing and 100% satisfaction guarantee.",
    serviceArea: "Metro + tri-county",
    initials: "DO",
    gradient: gradients[4],
    services: [
      { name: "AC tune-up", price: "$119" },
      { name: "Diagnostic visit", price: "$89" },
      { name: "New system install", price: "$4,500+" },
    ],
    photos: [gradients[4], gradients[1], gradients[3], gradients[5]],
    reviewList: [
      { name: "Ana M.", rating: 5, date: "1 week ago", text: "Diana saved our summer. Fair price, same day." },
    ],
  },
  {
    id: "lawn-lena",
    name: "Lena Park",
    business: "GreenLine Lawn Care",
    category: "lawn-care",
    verified: false,
    rating: 4.6,
    reviews: 91,
    startingPrice: 45,
    distance: 5.2,
    availability: "This week",
    description: "Weekly mowing, edging, hedge trimming and seasonal cleanups.",
    bio: "Locally owned. Consistent crew, sharp blades, clean edges.",
    serviceArea: "East side",
    initials: "LP",
    gradient: gradients[5],
    services: [
      { name: "Weekly mow", price: "$45" },
      { name: "Hedge trim", price: "$85" },
      { name: "Fall cleanup", price: "$220" },
    ],
    photos: [gradients[5], gradients[2], gradients[4], gradients[0]],
    reviewList: [
      { name: "Ross T.", rating: 5, date: "5 days ago", text: "Yard looks amazing every Friday." },
    ],
  },
];

export function getProvider(id: string) {
  return providers.find((p) => p.id === id);
}

export const testimonials = [
  { name: "Priya S.", role: "Customer", text: "Booked a plumber in under a minute. He was at my door in 30 minutes.", rating: 5 },
  { name: "Marcus J.", role: "Customer", text: "Finally an app that just works. The pros are actually vetted.", rating: 5 },
  { name: "Anika R.", role: "Customer", text: "Loved that I could see reviews, prices and availability in one place.", rating: 5 },
];