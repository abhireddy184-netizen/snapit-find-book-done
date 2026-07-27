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
  yearsExperience: number;
  phone: string;
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
    yearsExperience: 15,
    phone: "+1-415-555-0142",
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
    yearsExperience: 10,
    phone: "+1-415-555-0187",
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
    yearsExperience: 8,
    phone: "+1-415-555-0219",
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
    yearsExperience: 12,
    phone: "+1-415-555-0255",
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
    yearsExperience: 18,
    phone: "+1-415-555-0311",
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
    yearsExperience: 6,
    phone: "+1-415-555-0344",
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
  {
    id: "leo-fix",
    name: "Leo Nguyen",
    business: "Fixwell Plumbing",
    category: "plumbing",
    verified: true,
    rating: 4.8,
    reviews: 246,
    startingPrice: 69,
    distance: 2.1,
    availability: "Today",
    yearsExperience: 9,
    phone: "+1-415-555-0412",
    description: "Same-day drain, faucet and toilet repair. Transparent flat pricing.",
    bio: "Second-generation plumber. Text photos ahead of time for a firm quote before I arrive.",
    serviceArea: "Within 12 miles",
    initials: "LN",
    gradient: gradients[4],
    services: [
      { name: "Faucet swap", price: "$95" },
      { name: "Drain snake", price: "$139" },
      { name: "Toilet reset", price: "$110" },
    ],
    photos: [gradients[4], gradients[0], gradients[2], gradients[1]],
    reviewList: [
      { name: "Owen S.", rating: 5, date: "6 days ago", text: "Text-first pricing was a game changer. No surprises." },
    ],
  },
  {
    id: "trish-plumb",
    name: "Trisha Alvarez",
    business: "Alvarez & Co. Plumbing",
    category: "plumbing",
    verified: true,
    rating: 4.7,
    reviews: 174,
    startingPrice: 85,
    distance: 3.6,
    availability: "Tomorrow",
    yearsExperience: 11,
    phone: "+1-415-555-0498",
    description: "Water heaters, repipes and pressure diagnostics.",
    bio: "Women-owned. Licensed & bonded. Warranty on every install.",
    serviceArea: "Metro + south bay",
    initials: "TA",
    gradient: gradients[2],
    services: [
      { name: "Water heater install", price: "$520+" },
      { name: "Pressure check", price: "$79" },
    ],
    photos: [gradients[2], gradients[5], gradients[0], gradients[3]],
    reviewList: [
      { name: "Rae M.", rating: 5, date: "3 days ago", text: "Fair, professional and clean. Rare combo." },
    ],
  },
  {
    id: "jr-plumb",
    name: "J.R. Kessler",
    business: "Kessler Home Plumbing",
    category: "plumbing",
    verified: true,
    rating: 4.6,
    reviews: 132,
    startingPrice: 75,
    distance: 4.8,
    availability: "Today",
    yearsExperience: 7,
    phone: "+1-415-555-0517",
    description: "Leak detection specialists with acoustic + thermal tools.",
    bio: "We find hidden leaks without tearing up your walls.",
    serviceArea: "Greater metro",
    initials: "JK",
    gradient: gradients[1],
    services: [
      { name: "Leak detection", price: "$149" },
      { name: "Slab leak repair", price: "$650+" },
    ],
    photos: [gradients[1], gradients[4], gradients[3], gradients[0]],
    reviewList: [
      { name: "Bea C.", rating: 5, date: "2 weeks ago", text: "Found a leak two other companies missed." },
    ],
  },
  {
    id: "sam-electric",
    name: "Samir Patel",
    business: "Volt Brothers Electric",
    category: "electrical",
    verified: true,
    rating: 4.8,
    reviews: 289,
    startingPrice: 95,
    distance: 3.3,
    availability: "Today",
    yearsExperience: 14,
    phone: "+1-415-555-0621",
    description: "Panel upgrades, EV chargers and troubleshooting.",
    bio: "Master electrician. Same-day response for outages.",
    serviceArea: "Metro area",
    initials: "SP",
    gradient: gradients[3],
    services: [
      { name: "Diagnostic visit", price: "$95" },
      { name: "EV charger install", price: "$720" },
    ],
    photos: [gradients[3], gradients[1], gradients[5], gradients[2]],
    reviewList: [
      { name: "Nia J.", rating: 5, date: "1 week ago", text: "On time, clean install, easy to talk to." },
    ],
  },
  {
    id: "hana-clean",
    name: "Hana Okafor",
    business: "GreenLeaf Cleaning Co.",
    category: "house-cleaning",
    verified: true,
    rating: 4.9,
    reviews: 341,
    startingPrice: 109,
    distance: 1.6,
    availability: "Today",
    yearsExperience: 7,
    phone: "+1-415-555-0733",
    description: "Non-toxic, allergen-safe deep cleaning by trained teams.",
    bio: "Pet & kid-safe products. Same team every visit.",
    serviceArea: "Within 12 miles",
    initials: "HO",
    gradient: gradients[5],
    services: [
      { name: "Standard clean", price: "$109" },
      { name: "Deep clean", price: "$199" },
    ],
    photos: [gradients[5], gradients[0], gradients[4], gradients[1]],
    reviewList: [
      { name: "Cal V.", rating: 5, date: "4 days ago", text: "The bathroom actually sparkles. Great team." },
    ],
  },
  {
    id: "dax-handy",
    name: "Dax Miller",
    business: "Dax Does It All",
    category: "handyman",
    verified: true,
    rating: 4.9,
    reviews: 158,
    startingPrice: 70,
    distance: 2.2,
    availability: "Today",
    yearsExperience: 10,
    phone: "+1-415-555-0844",
    description: "Small repairs, mounting, painting and door alignment.",
    bio: "One visit, punch list done. Bring me your list.",
    serviceArea: "18 mile radius",
    initials: "DM",
    gradient: gradients[0],
    services: [
      { name: "Handyman hour", price: "$90/hr" },
      { name: "Door realignment", price: "$120" },
    ],
    photos: [gradients[0], gradients[3], gradients[4], gradients[2]],
    reviewList: [
      { name: "Iris B.", rating: 5, date: "5 days ago", text: "Nailed my whole list in 90 minutes." },
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