import type { LucideIcon } from "lucide-react";
import {
  Wrench, Zap, Wind, Refrigerator, Sparkles, Brush, Hammer, Tv, Sofa, PaintRoller,
  LayoutGrid, DoorOpen, Home, Truck, Trash2, Trees, Droplets, Fence, Bug, KeyRound,
  Car, Scissors, PawPrint, Snowflake, ShieldAlert, Boxes, Wifi, Waves,
} from "lucide-react";

/* ------------------------------------------------------------------ *
 * Market model — GPB launches USA-first but is globally extensible.
 * Availability can later vary by country -> region -> licensing rules.
 * ------------------------------------------------------------------ */

export type MarketStatus = "live" | "planned";

export type Region = { code: string; name: string };

export type Market = {
  code: string;            // ISO country code
  name: string;
  status: MarketStatus;
  currency: string;
  currencySymbol: string;
  locale: string;
  regionLabel: string;     // "State", "Province", "Region"
  /** Category slugs that always require a licensed/qualified provider here. */
  licensedCategories: string[];
  /** Category slugs not offered in this market (legal or market reasons). */
  restrictedCategories: string[];
  /** Local terminology overrides, e.g. { "lawn-outdoor": "Garden Care" } */
  terminology: Record<string, string>;
  regions: Region[];
};

const US_STATES: Region[] = [
  ["AL","Alabama"],["AK","Alaska"],["AZ","Arizona"],["AR","Arkansas"],["CA","California"],
  ["CO","Colorado"],["CT","Connecticut"],["DE","Delaware"],["DC","District of Columbia"],["FL","Florida"],
  ["GA","Georgia"],["HI","Hawaii"],["ID","Idaho"],["IL","Illinois"],["IN","Indiana"],
  ["IA","Iowa"],["KS","Kansas"],["KY","Kentucky"],["LA","Louisiana"],["ME","Maine"],
  ["MD","Maryland"],["MA","Massachusetts"],["MI","Michigan"],["MN","Minnesota"],["MS","Mississippi"],
  ["MO","Missouri"],["MT","Montana"],["NE","Nebraska"],["NV","Nevada"],["NH","New Hampshire"],
  ["NJ","New Jersey"],["NM","New Mexico"],["NY","New York"],["NC","North Carolina"],["ND","North Dakota"],
  ["OH","Ohio"],["OK","Oklahoma"],["OR","Oregon"],["PA","Pennsylvania"],["RI","Rhode Island"],
  ["SC","South Carolina"],["SD","South Dakota"],["TN","Tennessee"],["TX","Texas"],["UT","Utah"],
  ["VT","Vermont"],["VA","Virginia"],["WA","Washington"],["WV","West Virginia"],["WI","Wisconsin"],["WY","Wyoming"],
].map(([code, name]) => ({ code: code as string, name: name as string }));

export const markets: Market[] = [
  {
    code: "US",
    name: "United States",
    status: "live",
    currency: "USD",
    currencySymbol: "$",
    locale: "en-US",
    regionLabel: "State",
    licensedCategories: ["plumbing", "electrical", "hvac", "roofing-exterior", "pest-control", "locksmith", "pool-spa"],
    restrictedCategories: [],
    terminology: {},
    regions: US_STATES,
  },
  {
    code: "CA",
    name: "Canada",
    status: "planned",
    currency: "CAD",
    currencySymbol: "$",
    locale: "en-CA",
    regionLabel: "Province",
    licensedCategories: ["plumbing", "electrical", "hvac", "roofing-exterior", "pest-control", "locksmith"],
    restrictedCategories: [],
    terminology: {},
    regions: [
      { code: "AB", name: "Alberta" }, { code: "BC", name: "British Columbia" },
      { code: "MB", name: "Manitoba" }, { code: "NB", name: "New Brunswick" },
      { code: "NS", name: "Nova Scotia" }, { code: "ON", name: "Ontario" },
      { code: "QC", name: "Quebec" }, { code: "SK", name: "Saskatchewan" },
    ],
  },
  {
    code: "IN",
    name: "India",
    status: "planned",
    currency: "INR",
    currencySymbol: "₹",
    locale: "en-IN",
    regionLabel: "State",
    licensedCategories: ["electrical", "pest-control"],
    restrictedCategories: [],
    terminology: { "lawn-outdoor": "Garden Care", "hvac": "AC & Cooling" },
    regions: [
      { code: "DL", name: "Delhi" }, { code: "KA", name: "Karnataka" },
      { code: "MH", name: "Maharashtra" }, { code: "TS", name: "Telangana" },
      { code: "TN", name: "Tamil Nadu" }, { code: "UP", name: "Uttar Pradesh" },
    ],
  },
  {
    code: "GB",
    name: "United Kingdom",
    status: "planned",
    currency: "GBP",
    currencySymbol: "£",
    locale: "en-GB",
    regionLabel: "Region",
    licensedCategories: ["electrical", "hvac", "pest-control"],
    restrictedCategories: [],
    terminology: { "lawn-outdoor": "Garden Care", "drywall": "Plastering" },
    regions: [
      { code: "ENG", name: "England" }, { code: "SCT", name: "Scotland" },
      { code: "WLS", name: "Wales" }, { code: "NIR", name: "Northern Ireland" },
    ],
  },
];

export const DEFAULT_MARKET = "US";
export function getMarket(code: string = DEFAULT_MARKET) {
  return markets.find((m) => m.code === code) ?? markets[0]!;
}

/* ------------------------------------------------------------------ *
 * Service catalog
 * ------------------------------------------------------------------ */

export type SubService = {
  slug: string;
  name: string;
  blurb: string;
  /** Typical USA price guidance. Other markets localize later. */
  priceLow: number;
  priceHigh: number;
  unit?: string;
  /** Requires a licensed / qualified provider where the market demands it. */
  licensed?: boolean;
  featured?: boolean;
  /** Visual + text signals the AI discovery layer maps to this service. */
  cues?: string[];
};

export type MasterCategory = {
  slug: string;
  name: string;
  tagline: string;
  icon: LucideIcon;
  hex: string;
  gradient: string;
  /** Legacy provider-pool category used for demo matching. */
  providerCategory: string;
  popular?: boolean;
  emergency?: boolean;
  services: SubService[];
};

const s = (
  slug: string, name: string, blurb: string, priceLow: number, priceHigh: number,
  extra: Partial<SubService> = {},
): SubService => ({ slug, name, blurb, priceLow, priceHigh, ...extra });

export const catalog: MasterCategory[] = [
  {
    slug: "plumbing", name: "Plumbing", tagline: "Leaks, drains, fixtures and water heaters.",
    icon: Wrench, hex: "#E2704B", gradient: "from-[#E2704B] to-[#C0468F]", providerCategory: "plumbing",
    popular: true, emergency: true,
    services: [
      s("drain-clearing", "Drain Clearing", "Slow or blocked sinks, tubs and showers cleared.", 120, 320, { featured: true, licensed: true, cues: ["sink", "drain", "standing water"] }),
      s("faucet-replacement", "Faucet Replacement", "Swap a leaking or dated faucet for a new one.", 130, 350, { featured: true, licensed: true, cues: ["faucet", "tap", "dripping"] }),
      s("toilet-repair", "Toilet Repair", "Running, leaking, weak-flush or loose toilets.", 110, 380, { licensed: true, cues: ["toilet", "running water"] }),
      s("garbage-disposal-repair", "Garbage Disposal Repair", "Jammed, humming or leaking disposals.", 120, 320, { licensed: true }),
      s("water-heater-service", "Water Heater Repair & Install", "No hot water, leaks or full replacement.", 180, 2200, { licensed: true }),
      s("leak-detection", "Leak Detection", "Find hidden leaks before they damage walls.", 140, 450, { licensed: true, cues: ["water stain", "damp"] }),
      s("pipe-repair", "Pipe Repair & Repiping", "Burst, corroded or noisy pipework.", 200, 2500, { licensed: true }),
      s("shower-tub-plumbing", "Shower & Tub Plumbing", "Valves, diverters, drains and pressure issues.", 150, 700, { licensed: true }),
      s("sump-pump-service", "Sump Pump Service", "Install, repair or test your sump pump.", 220, 900, { licensed: true }),
      s("water-filtration", "Water Filtration & Softeners", "Whole-home filtration and softener installs.", 350, 2500, { licensed: true }),
    ],
  },
  {
    slug: "electrical", name: "Electrical", tagline: "Outlets, lighting, panels and safety.",
    icon: Zap, hex: "#B983FF", gradient: "from-[#B983FF] to-[#6F4CD8]", providerCategory: "electrical",
    popular: true, emergency: true,
    services: [
      s("light-fixture-installation", "Light Fixture Installation", "Pendants, chandeliers, flush mounts and more.", 110, 420, { featured: true, licensed: true, cues: ["light", "fixture", "chandelier"] }),
      s("ceiling-fan-installation", "Ceiling Fan Installation", "New fan, replacement or wobble/noise fix.", 130, 400, { featured: true, licensed: true, cues: ["ceiling fan", "fan"] }),
      s("outlet-switch-repair", "Outlet & Switch Troubleshooting", "Dead outlets, sparking switches, tripping breakers.", 95, 350, { licensed: true, cues: ["outlet", "switch", "socket"] }),
      s("panel-upgrade", "Electrical Panel Upgrade", "Older panels brought up to modern capacity.", 1200, 4200, { licensed: true }),
      s("ev-charger-installation", "EV Charger Installation", "Level 2 home charger install and circuit.", 550, 1800, { licensed: true }),
      s("recessed-lighting", "Recessed & Under-Cabinet Lighting", "Layered lighting for kitchens and living spaces.", 300, 1600, { licensed: true }),
      s("outdoor-lighting", "Outdoor & Landscape Lighting", "Path, security and accent lighting.", 250, 1500, { licensed: true }),
      s("generator-installation", "Backup Generator Setup", "Standby and portable generator wiring.", 800, 6000, { licensed: true }),
      s("electrical-safety-inspection", "Electrical Safety Inspection", "Whole-home check with a written report.", 130, 380, { licensed: true }),
    ],
  },
  {
    slug: "hvac", name: "Heating & Cooling", tagline: "AC, furnaces, tune-ups and air quality.",
    icon: Wind, hex: "#5FB6E8", gradient: "from-[#5FB6E8] to-[#7B7BE8]", providerCategory: "hvac",
    popular: true, emergency: true,
    services: [
      s("ac-repair", "AC Repair", "Warm air, short cycling or a system that won't start.", 140, 900, { featured: true, licensed: true, cues: ["air conditioner", "ac unit", "vent"] }),
      s("ac-tune-up", "AC Tune-Up", "Seasonal service to keep cooling efficient.", 90, 220, { licensed: true }),
      s("furnace-repair", "Furnace & Heating Repair", "No heat, odd noises or pilot problems.", 150, 950, { licensed: true }),
      s("thermostat-installation", "Thermostat Installation", "Smart or programmable thermostat setup.", 110, 350, { cues: ["thermostat"] }),
      s("duct-cleaning", "Duct Cleaning & Sealing", "Improve airflow and cut dust.", 300, 900 ),
      s("mini-split-installation", "Mini-Split Installation", "Ductless heating and cooling for any room.", 1800, 5500, { licensed: true }),
      s("air-quality", "Air Quality & Filtration", "Purifiers, humidifiers and filter upgrades.", 180, 1200 ),
    ],
  },
  {
    slug: "appliances", name: "Appliance Service", tagline: "Repair and installation for major appliances.",
    icon: Refrigerator, hex: "#7B7BE8", gradient: "from-[#7B7BE8] to-[#B983FF]", providerCategory: "appliance-repair",
    popular: true,
    services: [
      s("refrigerator-repair", "Refrigerator Repair", "Not cooling, leaking, icing or noisy fridges.", 140, 650, { featured: true, cues: ["refrigerator", "fridge", "freezer"] }),
      s("washer-repair", "Washer Repair", "Drainage, spin, leak and error-code faults.", 130, 550, { cues: ["washing machine", "washer"] }),
      s("dryer-repair", "Dryer Repair & Vent Cleaning", "No heat, long dry times, blocked vents.", 130, 500, { cues: ["dryer"] }),
      s("dishwasher-service", "Dishwasher Repair & Install", "Leaks, poor cleaning or a new install.", 130, 600, { cues: ["dishwasher"] }),
      s("oven-range-repair", "Oven & Range Repair", "Uneven heat, igniters, elements and controls.", 140, 700, { cues: ["oven", "stove", "range"] }),
      s("microwave-service", "Microwave Repair & Install", "Over-range replacement and repairs.", 120, 480 ),
      s("appliance-installation", "Appliance Installation", "Delivery-day hookup for any major appliance.", 90, 350, { featured: true }),
      s("appliance-diagnosis", "Appliance Diagnosis Visit", "One visit, clear answer on repair vs replace.", 79, 160 ),
    ],
  },
  {
    slug: "cleaning", name: "Home Cleaning", tagline: "Standard, deep and move-out cleaning.",
    icon: Sparkles, hex: "#4FC59A", gradient: "from-[#4FC59A] to-[#5FB6E8]", providerCategory: "house-cleaning",
    popular: true,
    services: [
      s("standard-cleaning", "Standard House Cleaning", "Regular upkeep for the whole home.", 110, 260, { featured: true }),
      s("deep-cleaning", "Deep Cleaning", "Top-to-bottom detail clean.", 190, 480, { featured: true }),
      s("move-in-out-cleaning", "Move-In / Move-Out Cleaning", "Empty-home clean for handover day.", 220, 600 ),
      s("bathroom-deep-cleaning", "Bathroom Deep Cleaning", "Grout, glass, fixtures and mildew treated.", 90, 260, { featured: true, cues: ["bathroom", "shower", "grout"] }),
      s("kitchen-deep-cleaning", "Kitchen Deep Cleaning", "Degrease, appliances in and out, cabinets.", 110, 320, { cues: ["kitchen"] }),
      s("post-construction-cleaning", "Post-Construction Cleaning", "Dust and debris after renovation.", 300, 900 ),
      s("recurring-cleaning", "Recurring Cleaning Plan", "Weekly, bi-weekly or monthly visits.", 90, 220, { unit: "per visit" }),
    ],
  },
  {
    slug: "carpet-upholstery-cleaning", name: "Carpet & Upholstery Cleaning", tagline: "Deep-clean soft surfaces and remove stains.",
    icon: Brush, hex: "#4FC59A", gradient: "from-[#4FC59A] to-[#7B7BE8]", providerCategory: "house-cleaning",
    services: [
      s("carpet-cleaning", "Carpet Cleaning", "Hot water extraction for rooms and stairs.", 120, 400, { featured: true, cues: ["carpet", "rug"] }),
      s("upholstery-cleaning", "Upholstery Cleaning", "Sofas, chairs and sectionals refreshed.", 110, 350, { featured: true, cues: ["sofa", "couch", "fabric"] }),
      s("stain-removal", "Stain & Odor Removal", "Targeted treatment for spills and pet odor.", 90, 300, { cues: ["stain", "spill"] }),
      s("area-rug-cleaning", "Area Rug Cleaning", "Off-site or in-home rug care.", 90, 380 ),
      s("mattress-cleaning", "Mattress Cleaning", "Sanitize and deodorize mattresses.", 80, 220 ),
    ],
  },
  {
    slug: "handyman", name: "Handyman", tagline: "The punch list, knocked out in one visit.",
    icon: Hammer, hex: "#E2704B", gradient: "from-[#E2704B] to-[#E8A24B]", providerCategory: "handyman",
    popular: true,
    services: [
      s("handyman-hour", "General Handyman (hourly)", "Bring your list — one pro, one visit.", 75, 130, { featured: true, unit: "per hour" }),
      s("door-alignment", "Door Repair & Alignment", "Sticking, sagging or noisy doors fixed.", 95, 320, { cues: ["door"] }),
      s("cabinet-repair", "Cabinet Repair & Adjustment", "Hinges, doors, drawers and soft-close.", 100, 400, { cues: ["cabinet"] }),
      s("caulking", "Caulking & Sealing", "Tubs, sinks, counters and windows resealed.", 90, 280, { cues: ["caulk", "silicone", "mildew"] }),
      s("weatherproofing", "Weatherstripping & Draft Sealing", "Cut drafts around doors and windows.", 90, 350 ),
      s("childproofing", "Childproofing & Safety Installs", "Gates, anchors, latches and guards.", 90, 300 ),
      s("small-repairs", "Small Repairs & Odd Jobs", "The little things you keep putting off.", 80, 250 ),
    ],
  },
  {
    slug: "mounting-installation", name: "Mounting & Installation", tagline: "TVs, shelves, mirrors, art and hardware.",
    icon: Tv, hex: "#6F4CD8", gradient: "from-[#6F4CD8] to-[#C0468F]", providerCategory: "handyman",
    popular: true,
    services: [
      s("tv-mounting", "TV Mounting", "Secure wall mount with cables tidied.", 100, 350, { featured: true, cues: ["tv", "television", "blank wall"] }),
      s("shelf-installation", "Shelf Installation", "Floating shelves and bracket shelving.", 85, 300, { featured: true, cues: ["shelf", "shelving"] }),
      s("mirror-hanging", "Mirror Hanging", "Heavy and oversized mirrors hung safely.", 85, 280, { cues: ["mirror"] }),
      s("art-hanging", "Art & Gallery Wall Hanging", "Single pieces or a full gallery layout.", 85, 320, { cues: ["art", "picture frame", "blank wall"] }),
      s("curtain-rod-installation", "Curtain Rod Installation", "Rods, tracks and drapery hardware.", 85, 280, { featured: true, cues: ["curtain", "window"] }),
      s("blind-installation", "Blind & Shade Installation", "Blinds, shades and shutters fitted.", 90, 400, { cues: ["blinds", "window"] }),
      s("closet-system-installation", "Closet System Installation", "Rods, racks and modular closet kits.", 150, 800 ),
      s("wall-anchoring", "Furniture Anchoring", "Tip-over protection for tall furniture.", 75, 200 ),
    ],
  },
  {
    slug: "furniture", name: "Furniture Services", tagline: "Assembly, repair, upholstery and cushions.",
    icon: Sofa, hex: "#C0468F", gradient: "from-[#C0468F] to-[#6F4CD8]", providerCategory: "handyman",
    popular: true,
    services: [
      s("furniture-assembly", "Furniture Assembly", "Flat-pack built right, first time.", 70, 300, { featured: true, cues: ["flat pack", "box furniture"] }),
      s("sofa-repair", "Sofa & Chair Repair", "Sagging seats, broken frames and loose joints.", 140, 700, { featured: true, cues: ["sofa", "couch", "sagging", "soft seat"] }),
      s("cushion-foam-replacement", "Cushion & Foam Replacement", "New foam and inserts that hold their shape.", 120, 650, { featured: true, cues: ["cushion", "sunken seat", "soft underneath"] }),
      s("upholstery-repair", "Upholstery Repair & Reupholstery", "Tears, worn fabric and full recovers.", 200, 1800, { cues: ["torn fabric", "worn"] }),
      s("recliner-mechanism-repair", "Recliner Mechanism Repair", "Levers, cables and motors restored.", 120, 500 ),
      s("wood-furniture-repair", "Wood Furniture Repair", "Scratches, wobbles and broken legs.", 110, 600 ),
      s("furniture-disassembly", "Furniture Disassembly & Moving Prep", "Break down safely before a move.", 80, 320 ),
    ],
  },
  {
    slug: "painting", name: "Painting", tagline: "Interior, exterior, cabinets and accents.",
    icon: PaintRoller, hex: "#E8A24B", gradient: "from-[#E8A24B] to-[#E2704B]", providerCategory: "handyman",
    popular: true,
    services: [
      s("interior-painting", "Interior Painting", "Rooms, ceilings and trim, cleanly cut in.", 350, 2500, { featured: true, cues: ["wall", "room", "scuffed paint"] }),
      s("exterior-painting", "Exterior Painting", "Siding, trim and doors weather-protected.", 1200, 7000 ),
      s("accent-wall", "Accent Wall & Feature Finish", "One wall, big change.", 180, 900 ),
      s("cabinet-painting", "Cabinet Painting & Refinishing", "Kitchen cabinets refreshed without replacing.", 900, 4500, { cues: ["cabinet", "kitchen"] }),
      s("trim-door-painting", "Trim & Door Painting", "Crisp baseboards, casings and doors.", 200, 1200 ),
      s("touch-up-painting", "Touch-Up Painting", "Scuffs, patches and small repaints.", 120, 400 ),
    ],
  },
  {
    slug: "walls-drywall", name: "Walls & Drywall", tagline: "Patching, texture, wallpaper and repairs.",
    icon: LayoutGrid, hex: "#E8A24B", gradient: "from-[#E8A24B] to-[#C0468F]", providerCategory: "handyman",
    services: [
      s("drywall-patching", "Drywall Patch & Hole Repair", "Doorknob dents to large cut-outs.", 110, 500, { featured: true, cues: ["hole in wall", "crack", "drywall"] }),
      s("texture-matching", "Texture Matching", "Knockdown, orange peel and smooth finishes.", 150, 600 ),
      s("water-damage-drywall", "Water-Damaged Drywall Repair", "Cut out, replace and refinish.", 200, 900, { cues: ["water stain", "ceiling stain"] }),
      s("wallpaper-installation", "Wallpaper Installation", "Feature walls and full rooms.", 300, 1800, { cues: ["wallpaper"] }),
      s("wallpaper-removal", "Wallpaper Removal", "Stripped back and wall prepped for paint.", 250, 1200 ),
      s("wall-paneling", "Paneling, Wainscoting & Trim", "Board and batten, wainscot and molding.", 400, 2500 ),
    ],
  },
  {
    slug: "tile-grout", name: "Tile & Grout", tagline: "Repair, regrouting, sealing and new tile.",
    icon: LayoutGrid, hex: "#5FB6E8", gradient: "from-[#5FB6E8] to-[#4FC59A]", providerCategory: "handyman",
    services: [
      s("tile-repair", "Tile Repair & Replacement", "Cracked, loose or hollow tiles replaced.", 150, 700, { featured: true, cues: ["tile", "cracked tile"] }),
      s("grout-cleaning", "Grout Cleaning & Sealing", "Bring grout lines back to their original color.", 150, 500, { featured: true, cues: ["grout", "dirty grout"] }),
      s("regrouting", "Regrouting", "Old grout removed and replaced.", 250, 900, { cues: ["crumbling grout"] }),
      s("backsplash-installation", "Backsplash Installation", "Kitchen and bar backsplash tiling.", 400, 1600, { cues: ["kitchen", "backsplash"] }),
      s("shower-tile-installation", "Shower & Bath Tile Installation", "Waterproofed tile for wet areas.", 900, 5000 ),
      s("floor-tile-installation", "Floor Tile Installation", "Porcelain, ceramic and stone floors.", 800, 5000 ),
    ],
  },
  {
    slug: "flooring", name: "Flooring", tagline: "Install, repair and refinish any floor.",
    icon: LayoutGrid, hex: "#E2704B", gradient: "from-[#E2704B] to-[#7B7BE8]", providerCategory: "handyman",
    services: [
      s("lvp-laminate-installation", "Vinyl Plank & Laminate Installation", "Durable click-lock flooring installed.", 700, 4500, { featured: true }),
      s("hardwood-installation", "Hardwood Installation", "Solid and engineered hardwood.", 1500, 9000 ),
      s("hardwood-refinishing", "Hardwood Refinishing", "Sand, stain and seal existing floors.", 900, 4000 ),
      s("floor-repair", "Floor Repair", "Squeaks, gaps, water damage and boards.", 180, 900, { cues: ["floor", "squeak"] }),
      s("carpet-installation", "Carpet Installation", "Rooms, stairs and padding.", 500, 3000 ),
      s("baseboard-installation", "Baseboard & Molding Installation", "Clean edges after new flooring.", 250, 1500 ),
    ],
  },
  {
    slug: "doors-windows", name: "Doors, Windows & Coverings", tagline: "Fit, repair and dress openings.",
    icon: DoorOpen, hex: "#7B7BE8", gradient: "from-[#7B7BE8] to-[#5FB6E8]", providerCategory: "handyman",
    services: [
      s("interior-door-installation", "Interior Door Installation", "Slab or pre-hung doors fitted.", 180, 700, { cues: ["door"] }),
      s("exterior-door-installation", "Exterior Door Installation", "Entry doors, weather-sealed.", 400, 2200 ),
      s("screen-repair", "Screen Repair & Replacement", "Window and patio screens.", 70, 300 ),
      s("window-repair", "Window Repair", "Sashes, seals, cranks and glass.", 150, 900 ),
      s("blinds-shades-fitting", "Blinds & Shades Fitting", "Measured and installed to fit.", 90, 500 ),
      s("curtain-track-installation", "Curtain Track & Drapery Installation", "Ceiling tracks and heavy drapes.", 100, 450 ),
      s("weather-sealing", "Door & Window Sealing", "Stop drafts, dust and noise.", 90, 400 ),
    ],
  },
  {
    slug: "smart-home", name: "Smart Home & Tech", tagline: "Doorbells, cameras, Wi-Fi and setup.",
    icon: Wifi, hex: "#6F4CD8", gradient: "from-[#6F4CD8] to-[#5FB6E8]", providerCategory: "electrical",
    services: [
      s("smart-doorbell-installation", "Smart Doorbell Installation", "Video doorbell wired and configured.", 110, 350, { featured: true, cues: ["doorbell"] }),
      s("security-camera-installation", "Security Camera Installation", "Indoor and outdoor camera systems.", 200, 1500, { featured: true, cues: ["camera", "security"] }),
      s("smart-lock-installation", "Smart Lock Installation", "Keypad and app-controlled locks.", 100, 400, { cues: ["lock", "door"] }),
      s("smart-thermostat-setup", "Smart Thermostat Setup", "Installed, wired and app-linked.", 110, 350 ),
      s("wifi-network-setup", "Wi-Fi & Mesh Network Setup", "Whole-home coverage, no dead zones.", 120, 600 ),
      s("home-theater-setup", "Home Theater & Sound Setup", "Speakers, receivers and calibration.", 200, 1500 ),
      s("smart-lighting", "Smart Lighting & Automation", "Scenes, switches and voice control.", 150, 900 ),
    ],
  },
  {
    slug: "moving", name: "Moving & Heavy Lifting", tagline: "Load, move, pack and place.",
    icon: Truck, hex: "#5FB6E8", gradient: "from-[#5FB6E8] to-[#6F4CD8]", providerCategory: "moving-help",
    popular: true,
    services: [
      s("local-moving", "Local Moving Help", "Two pros and a truck for local moves.", 250, 1400, { featured: true }),
      s("loading-unloading", "Loading & Unloading", "You rent the truck, we do the lifting.", 120, 600 ),
      s("packing-unpacking", "Packing & Unpacking", "Careful packing, labeled and organized.", 150, 900 ),
      s("heavy-item-moving", "Heavy Item Moving", "Safes, pianos, treadmills and appliances.", 150, 700, { cues: ["piano", "safe", "appliance"] }),
      s("in-home-rearranging", "In-Home Furniture Rearranging", "Move it room to room, damage-free.", 90, 350 ),
      s("storage-runs", "Storage Unit Runs", "Load-out and drop-off at your unit.", 120, 600 ),
    ],
  },
  {
    slug: "junk-removal", name: "Junk Removal & Hauling", tagline: "Clear it out and haul it away.",
    icon: Trash2, hex: "#4FC59A", gradient: "from-[#4FC59A] to-[#E8A24B]", providerCategory: "moving-help",
    services: [
      s("single-item-removal", "Single Item Removal", "One couch, mattress or appliance gone.", 80, 250, { featured: true, cues: ["old furniture", "mattress"] }),
      s("full-junk-removal", "Full Junk Removal", "Truckload clear-outs.", 200, 800 ),
      s("garage-cleanout", "Garage & Basement Cleanout", "Reclaim the space you lost.", 250, 900 ),
      s("appliance-disposal", "Appliance & E-Waste Disposal", "Responsibly recycled.", 90, 300 ),
      s("yard-debris-hauling", "Yard Debris Hauling", "Branches, soil and green waste.", 120, 500 ),
    ],
  },
  {
    slug: "lawn-outdoor", name: "Lawn & Outdoor", tagline: "Mowing, trimming, cleanup and irrigation.",
    icon: Trees, hex: "#4FC59A", gradient: "from-[#4FC59A] to-[#8DD35F]", providerCategory: "lawn-care",
    popular: true,
    services: [
      s("lawn-mowing", "Lawn Mowing & Edging", "Regular cuts with clean edges.", 45, 150, { featured: true, cues: ["lawn", "grass", "yard"] }),
      s("hedge-trimming", "Hedge & Shrub Trimming", "Shaped, thinned and tidied.", 90, 400, { cues: ["hedge", "bush"] }),
      s("yard-cleanup", "Yard Cleanup", "Leaves, branches and seasonal debris.", 120, 600, { featured: true, cues: ["leaves", "overgrown"] }),
      s("weed-control", "Weed Control & Fertilization", "Treatment plans for a healthy lawn.", 60, 250 ),
      s("mulching-planting", "Mulching & Planting", "Beds refreshed and planted.", 150, 900 ),
      s("irrigation-service", "Sprinkler & Irrigation Service", "Heads, valves, timers and leaks.", 120, 700, { cues: ["sprinkler"] }),
      s("tree-trimming", "Tree Trimming (small)", "Low limbs and small trees.", 150, 900 ),
      s("sod-installation", "Sod & Lawn Installation", "New lawn, properly prepped.", 500, 4000 ),
    ],
  },
  {
    slug: "exterior-cleaning", name: "Exterior Cleaning", tagline: "Pressure washing, gutters and windows.",
    icon: Droplets, hex: "#5FB6E8", gradient: "from-[#5FB6E8] to-[#4FC59A]", providerCategory: "house-cleaning",
    services: [
      s("pressure-washing", "Pressure Washing", "Driveways, siding, decks and patios.", 150, 650, { featured: true, cues: ["driveway", "siding", "moss"] }),
      s("gutter-cleaning", "Gutter Cleaning", "Clear downspouts before the next storm.", 120, 400, { featured: true, cues: ["gutter"] }),
      s("roof-cleaning", "Roof & Moss Treatment", "Soft-wash treatment for shingles.", 300, 1200 ),
      s("window-washing", "Window Washing", "Interior and exterior glass.", 120, 450 ),
      s("deck-restoration", "Deck Cleaning & Sealing", "Wash, sand and reseal.", 300, 1500 ),
    ],
  },
  {
    slug: "outdoor-structures", name: "Fence, Deck & Patio", tagline: "Build, repair and refresh outdoor structures.",
    icon: Fence, hex: "#E8A24B", gradient: "from-[#E8A24B] to-[#4FC59A]", providerCategory: "handyman",
    services: [
      s("fence-repair", "Fence Repair", "Leaning posts, broken boards, gate sag.", 150, 900, { cues: ["fence"] }),
      s("fence-installation", "Fence Installation", "Wood, vinyl and metal fencing.", 1500, 9000 ),
      s("deck-repair", "Deck Repair", "Boards, railings and structure.", 250, 2000 ),
      s("patio-pavers", "Patio & Paver Work", "Pavers, gravel and small hardscape.", 800, 6000 ),
      s("gate-installation", "Gate Installation & Adjustment", "Hardware, hinges and alignment.", 150, 900 ),
      s("shed-assembly", "Shed Assembly", "Kit sheds built on your pad.", 300, 1600 ),
    ],
  },
  {
    slug: "garage", name: "Garage & Doors", tagline: "Garage doors, openers and storage.",
    icon: Home, hex: "#7B7BE8", gradient: "from-[#7B7BE8] to-[#E2704B]", providerCategory: "handyman",
    services: [
      s("garage-door-repair", "Garage Door Repair", "Springs, rollers, cables and alignment.", 150, 700, { featured: true, cues: ["garage door"] }),
      s("garage-opener-installation", "Garage Opener Installation", "Smart openers installed and paired.", 200, 700 ),
      s("garage-organization", "Garage Storage & Organization", "Racks, shelving and overhead storage.", 250, 1500 ),
      s("garage-floor-coating", "Garage Floor Coating", "Epoxy and polyaspartic finishes.", 800, 4000 ),
    ],
  },
  {
    slug: "pest-control", name: "Pest Control", tagline: "Licensed treatment and prevention.",
    icon: Bug, hex: "#8DD35F", gradient: "from-[#8DD35F] to-[#4FC59A]", providerCategory: "handyman",
    services: [
      s("general-pest-treatment", "General Pest Treatment", "Ants, roaches and common household pests.", 120, 400, { licensed: true }),
      s("rodent-control", "Rodent Control & Exclusion", "Trapping plus sealing entry points.", 200, 900, { licensed: true }),
      s("termite-inspection", "Termite Inspection & Treatment", "Inspection, report and treatment plan.", 150, 2500, { licensed: true }),
      s("mosquito-treatment", "Mosquito & Yard Treatment", "Seasonal barrier treatments.", 90, 400, { licensed: true }),
      s("bed-bug-treatment", "Bed Bug Treatment", "Heat or chemical protocols.", 400, 2500, { licensed: true }),
    ],
  },
  {
    slug: "locksmith", name: "Locksmith & Access", tagline: "Lockouts, rekeying and hardware.",
    icon: KeyRound, hex: "#C0468F", gradient: "from-[#C0468F] to-[#E2704B]", providerCategory: "handyman",
    emergency: true,
    services: [
      s("lockout-service", "Lockout Service", "Back inside without damage.", 90, 300, { licensed: true, featured: true }),
      s("rekey-locks", "Rekey Locks", "New keys without new hardware.", 90, 350, { licensed: true }),
      s("deadbolt-installation", "Deadbolt & Hardware Installation", "Upgrade entry security.", 90, 400, { licensed: true }),
      s("key-duplication", "Key Duplication & Replacement", "Home and mailbox keys.", 25, 120, { licensed: true }),
    ],
  },
  {
    slug: "roofing-exterior", name: "Roofing & Exterior", tagline: "Leaks, repairs and exterior surfaces.",
    icon: Home, hex: "#E2704B", gradient: "from-[#E2704B] to-[#6F4CD8]", providerCategory: "handyman",
    services: [
      s("roof-leak-repair", "Roof Leak Repair", "Find and stop the leak.", 250, 1500, { licensed: true, cues: ["ceiling stain", "roof"] }),
      s("shingle-replacement", "Shingle Repair & Replacement", "Wind and storm damage.", 300, 2500, { licensed: true }),
      s("gutter-installation", "Gutter Installation", "New gutters and downspouts.", 600, 3000 ),
      s("siding-repair", "Siding Repair", "Cracked, loose or missing panels.", 250, 2000 ),
      s("roof-inspection", "Roof Inspection", "Written condition report with photos.", 120, 400, { licensed: true }),
    ],
  },
  {
    slug: "pool-spa", name: "Pool & Spa", tagline: "Cleaning, chemistry and equipment.",
    icon: Waves, hex: "#5FB6E8", gradient: "from-[#5FB6E8] to-[#7B7BE8]", providerCategory: "handyman",
    services: [
      s("pool-cleaning", "Pool Cleaning & Maintenance", "Skim, vacuum, brush and balance.", 100, 350, { licensed: true }),
      s("pool-equipment-repair", "Pool Equipment Repair", "Pumps, filters and heaters.", 180, 1200, { licensed: true }),
      s("pool-opening-closing", "Pool Opening & Closing", "Seasonal service.", 200, 700, { licensed: true }),
      s("hot-tub-service", "Hot Tub & Spa Service", "Drain, clean, refill and diagnose.", 150, 700, { licensed: true }),
    ],
  },
  {
    slug: "organization", name: "Home Organization", tagline: "Systems that actually stay tidy.",
    icon: Boxes, hex: "#B983FF", gradient: "from-[#B983FF] to-[#4FC59A]", providerCategory: "house-cleaning",
    services: [
      s("closet-organization", "Closet Organization", "Sorted, systemized and labeled.", 150, 700, { featured: true }),
      s("kitchen-pantry-organization", "Kitchen & Pantry Organization", "Zones that make cooking easier.", 150, 700 ),
      s("home-office-setup", "Home Office Setup", "Desk, cable and storage layout.", 120, 600 ),
      s("declutter-session", "Decluttering Session", "Hands-on help deciding what stays.", 100, 400, { unit: "per session" }),
      s("move-organization", "Move-In Organization", "Unpacked and put away properly.", 200, 900 ),
    ],
  },
  {
    slug: "beauty-at-home", name: "Beauty at Home", tagline: "Salon-quality, at your door.",
    icon: Scissors, hex: "#C0468F", gradient: "from-[#C0468F] to-[#B983FF]", providerCategory: "beauty-spa",
    popular: true,
    services: [
      s("haircut-styling", "Haircut & Styling", "Cuts and styling in your own space.", 45, 180, { featured: true, licensed: true, cues: ["hair", "haircut"] }),
      s("blowout", "Blowout & Blow-Dry", "Smooth, event-ready hair.", 45, 140, { featured: true, licensed: true, cues: ["hair"] }),
      s("hair-color", "Hair Color & Highlights", "Color services where licensing allows.", 90, 350, { licensed: true }),
      s("hair-treatment", "Hair Treatments", "Deep conditioning, keratin and scalp care.", 60, 300, { licensed: true }),
      s("makeup-application", "Makeup Application", "Everyday, evening and photo-ready looks.", 60, 250, { featured: true, cues: ["makeup"] }),
      s("bridal-event-beauty", "Bridal & Event Beauty", "Hair and makeup for the whole party.", 150, 900, { licensed: true }),
      s("manicure", "Manicure", "Classic, gel and nail art where permitted.", 35, 120, { licensed: true, cues: ["nails", "hands", "manicure"] }),
      s("pedicure", "Pedicure", "At-home pedicure where licensing allows.", 45, 140, { licensed: true, cues: ["feet", "toenails"] }),
      s("nail-extensions", "Nail Extensions & Refills", "Acrylic and gel extensions.", 55, 200, { licensed: true }),
      s("mens-grooming", "Men's Grooming", "Clipper cuts, fades and tidy-ups.", 35, 120, { featured: true, licensed: true, cues: ["beard", "haircut"] }),
      s("beard-trim", "Beard Trim & Shaping", "Line-ups and hot-towel finishes.", 25, 90, { licensed: true, cues: ["beard"] }),
      s("barber-home-visit", "Barber Home Visit", "Licensed mobile barber where permitted.", 40, 150, { licensed: true }),
      s("waxing", "Waxing & Hair Removal", "Where local licensing permits.", 35, 200, { licensed: true }),
      s("lash-brow", "Lash & Brow Services", "Shaping, tinting and lash sets.", 40, 220, { licensed: true }),
      s("facial-skincare", "Facial & Skincare", "Non-medical facials by licensed estheticians.", 70, 250, { licensed: true, cues: ["skin", "face"] }),
      s("massage-therapy", "Massage Therapy", "Licensed therapists, in your home.", 90, 250, { licensed: true }),
    ],
  },
  {
    slug: "auto-mobile", name: "Auto & Mobile Services", tagline: "They come to your driveway.",
    icon: Car, hex: "#6F4CD8", gradient: "from-[#6F4CD8] to-[#E2704B]", providerCategory: "auto-services",
    popular: true,
    services: [
      s("mobile-car-detailing", "Mobile Car Detailing", "Interior and exterior detail at home.", 90, 400, { featured: true, cues: ["car", "vehicle"] }),
      s("mobile-oil-change", "Mobile Oil Change", "Routine service in your driveway.", 70, 180 ),
      s("mobile-diagnostics", "Mobile Diagnostics", "Check-engine and no-start diagnosis.", 80, 220, { cues: ["dashboard light"] }),
      s("battery-replacement", "Battery Replacement", "Tested, swapped and recycled.", 120, 350 ),
      s("brake-service", "Mobile Brake Service", "Pads and rotors where feasible on site.", 200, 700 ),
      s("tire-service", "Tire Change & Rotation", "Flats, swaps and seasonal changeovers.", 60, 250 ),
      s("windshield-repair", "Windshield Chip Repair", "Stop a chip becoming a crack.", 70, 250, { cues: ["windshield", "crack"] }),
    ],
  },
  {
    slug: "pet-household", name: "Pet-Related Home Services", tagline: "Pet-friendly help around the house.",
    icon: PawPrint, hex: "#E8A24B", gradient: "from-[#E8A24B] to-[#B983FF]", providerCategory: "house-cleaning",
    services: [
      s("pet-odor-treatment", "Pet Odor & Stain Treatment", "Carpets, upholstery and floors.", 100, 400, { cues: ["pet stain"] }),
      s("pet-door-installation", "Pet Door Installation", "Doors, walls and screens.", 150, 600 ),
      s("pet-waste-removal", "Yard Waste Removal (pets)", "Regular yard clean-up service.", 20, 90, { unit: "per visit" }),
      s("mobile-pet-grooming", "Mobile Pet Grooming", "Bath, trim and nails at home.", 60, 200 ),
      s("pet-fencing", "Pet Fencing & Gates", "Containment for yards and rooms.", 200, 1200 ),
    ],
  },
  {
    slug: "seasonal", name: "Seasonal Services", tagline: "Right help at the right time of year.",
    icon: Snowflake, hex: "#5FB6E8", gradient: "from-[#5FB6E8] to-[#C0468F]", providerCategory: "handyman",
    services: [
      s("holiday-light-installation", "Holiday Light Installation", "Hung, timed and taken down after.", 200, 1200 ),
      s("snow-removal", "Snow Removal", "Driveways, walkways and salting.", 60, 300 ),
      s("winterization", "Home Winterization", "Pipes, drafts and outdoor faucets.", 120, 600 ),
      s("spring-yard-prep", "Spring Yard Prep", "Cleanup, mulch and first cut.", 150, 700 ),
      s("storm-prep-cleanup", "Storm Prep & Cleanup", "Before and after severe weather.", 150, 900 ),
    ],
  },
  {
    slug: "errands", name: "Errands & Personal Assistance", tagline: "Time back in your week.",
    icon: Boxes, hex: "#B983FF", gradient: "from-[#B983FF] to-[#5FB6E8]", providerCategory: "moving-help",
    services: [
      s("shopping-delivery", "Shopping & Pickup", "Store runs and curbside pickups.", 30, 120 ),
      s("waiting-service", "Wait Service", "Someone home for a delivery or repair.", 40, 150, { unit: "per hour" }),
      s("assembly-returns", "Returns & Drop-Offs", "Packages, donations and recycling.", 30, 120 ),
      s("event-setup", "Event Setup & Teardown", "Tables, chairs, décor and cleanup.", 100, 600 ),
    ],
  },
  {
    slug: "emergency-home", name: "Emergency Home Services", tagline: "24/7 triage when it can't wait.",
    icon: ShieldAlert, hex: "#D64545", gradient: "from-[#D64545] to-[#E2704B]", providerCategory: "plumbing",
    emergency: true,
    services: [
      s("burst-pipe", "Burst Pipe & Flooding", "Shut-off, containment and repair.", 250, 2500, { licensed: true, featured: true }),
      s("power-outage", "Power Loss & Electrical Emergency", "Sparks, burning smells, dead circuits.", 180, 1200, { licensed: true, featured: true }),
      s("no-heat-no-ac", "No Heat / No AC", "Urgent HVAC dispatch.", 180, 1200, { licensed: true }),
      s("emergency-lockout", "Emergency Lockout", "Fast, damage-free entry.", 90, 350, { licensed: true }),
      s("water-damage-response", "Water Damage Response", "Extraction and drying.", 400, 3500, { licensed: true }),
      s("emergency-board-up", "Emergency Board-Up", "Secure broken doors and windows.", 200, 900 ),
    ],
  },
];

/* --------------------------- helpers --------------------------- */

export const popularCategories = catalog.filter((c) => c.popular);

export function getCategoryBySlug(slug: string) {
  return catalog.find((c) => c.slug === slug);
}

export type ServiceHit = { category: MasterCategory; service: SubService };

export function allServices(): ServiceHit[] {
  return catalog.flatMap((category) => category.services.map((service) => ({ category, service })));
}

export const TOTAL_SERVICES = allServices().length;

export function getService(categorySlug: string, serviceSlug: string): ServiceHit | undefined {
  const category = getCategoryBySlug(categorySlug);
  const service = category?.services.find((x) => x.slug === serviceSlug);
  return category && service ? { category, service } : undefined;
}

export function searchServices(query: string, limit = 40): ServiceHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored = allServices()
    .map((hit) => {
      const haystack = [hit.service.name, hit.service.blurb, hit.category.name, ...(hit.service.cues ?? [])]
        .join(" ").toLowerCase();
      if (!haystack.includes(q)) return null;
      const score = hit.service.name.toLowerCase().startsWith(q) ? 0 : hit.service.name.toLowerCase().includes(q) ? 1 : 2;
      return { hit, score };
    })
    .filter(Boolean) as { hit: ServiceHit; score: number }[];
  return scored.sort((a, b) => a.score - b.score).slice(0, limit).map((x) => x.hit);
}

/** Availability + licensing eligibility for a category in a given market. */
export function serviceEligibility(categorySlug: string, marketCode: string = DEFAULT_MARKET) {
  const market = getMarket(marketCode);
  const available = !market.restrictedCategories.includes(categorySlug);
  const licenseRequired = market.licensedCategories.includes(categorySlug);
  const label = market.terminology[categorySlug];
  return { market, available, licenseRequired, localName: label };
}

export function formatPrice(low: number, high: number, marketCode: string = DEFAULT_MARKET) {
  const { currencySymbol } = getMarket(marketCode);
  return `${currencySymbol}${low.toLocaleString()}–${currencySymbol}${high.toLocaleString()}`;
}

/** Catalog category slug -> legacy demo-provider pool slug. */
export function providerPoolFor(categorySlug: string) {
  return getCategoryBySlug(categorySlug)?.providerCategory ?? "handyman";
}
