import { useEffect, useState } from "react";

type Pro = {
  id: string;
  label: string;
  bubble: string;
  /** silhouette + accent colors */
  skin: string;
  outfit: string;
  outfitDark: string;
  accent: string;
  hair: string;
  Figure: (p: { skin: string; outfit: string; outfitDark: string; accent: string; hair: string }) => JSX.Element;
};

/* ---------- shared silhouette pieces ---------- */

function Head({ skin, hair, cap }: { skin: string; hair: string; cap?: string }) {
  return (
    <g>
      {/* neck */}
      <rect x="46" y="34" width="8" height="8" rx="4" fill={skin} />
      {/* head */}
      <ellipse cx="50" cy="26" rx="9.5" ry="10.5" fill={skin} />
      {/* hair */}
      {!cap && <path d="M40.5 24c0-7 4.5-11 9.5-11s9.5 4 9.5 11c0-4-4-6-9.5-6s-9.5 2-9.5 6z" fill={hair} />}
      {cap && (
        <g>
          <path d="M40 22.5c0-6 4.6-9.5 10-9.5s10 3.5 10 9.5z" fill={cap} />
          <path d="M39 22.5h22c1.6 0 2.4 1 2.4 2H39z" fill={cap} opacity="0.85" />
        </g>
      )}
    </g>
  );
}

function Legs({ outfit, shoe }: { outfit: string; shoe: string }) {
  return (
    <g>
      <g className="walk-swing-back" style={{ transformBox: "fill-box" }}>
        <rect x="45" y="70" width="6.5" height="26" rx="3.2" fill={outfit} opacity="0.75" />
        <rect x="42.5" y="93" width="11" height="5" rx="2.5" fill={shoe} opacity="0.8" />
      </g>
      <g className="walk-swing-front" style={{ transformBox: "fill-box" }}>
        <rect x="49" y="70" width="6.5" height="26" rx="3.2" fill={outfit} />
        <rect x="47" y="93" width="12" height="5" rx="2.5" fill={shoe} />
      </g>
    </g>
  );
}

function Torso({ outfit, outfitDark }: { outfit: string; outfitDark: string }) {
  return (
    <g>
      <path d="M42 44c0-3.4 3.4-6 8-6s8 2.6 8 6v22c0 3-2 5-4.6 5h-6.8C44 71 42 69 42 66z" fill={outfit} />
      <path d="M50 38c4.6 0 8 2.6 8 6v8h-16v-8c0-3.4 3.4-6 8-6z" fill={outfitDark} opacity="0.55" />
    </g>
  );
}

/* ---------- figures ---------- */

function Plumber({ skin, outfit, outfitDark, accent, hair }: any) {
  return (
    <g className="walk-bob">
      <Head skin={skin} hair={hair} cap={accent} />
      <Torso outfit={outfit} outfitDark={outfitDark} />
      <Legs outfit={outfitDark} shoe="#3a2a30" />
      {/* back arm */}
      <rect className="walk-swing-back" style={{ transformBox: "fill-box" }} x="39" y="45" width="5.5" height="22" rx="2.75" fill={outfitDark} opacity="0.7" />
      {/* front arm holding toolbox */}
      <rect x="56" y="45" width="5.5" height="24" rx="2.75" fill={outfit} />
      <g>
        <rect x="58" y="68" width="20" height="13" rx="2.5" fill={accent} />
        <rect x="58" y="68" width="20" height="4" rx="2" fill={outfitDark} opacity="0.6" />
        <path d="M64 68c0-2.4 1.6-4 4-4s4 1.6 4 4" stroke={outfitDark} strokeWidth="1.6" fill="none" />
      </g>
    </g>
  );
}

function BeautyPro({ skin, outfit, outfitDark, accent, hair }: any) {
  return (
    <g className="walk-bob">
      <g>
        <Head skin={skin} hair={hair} />
        {/* tied-back professional hair */}
        <path d="M58 24c4 2 5 7 3 12-1.6-4-3-6-5-7z" fill={hair} />
      </g>
      {/* tailored tunic */}
      <path d="M42 44c0-3.4 3.4-6 8-6s8 2.6 8 6v20c0 3-2 5-4.6 5h-6.8C44 69 42 67 42 64z" fill={outfit} />
      <path d="M50 38c4.6 0 8 2.6 8 6v7h-16v-7c0-3.4 3.4-6 8-6z" fill={outfitDark} opacity="0.5" />
      {/* legs with heels */}
      <g>
        <g className="walk-swing-back" style={{ transformBox: "fill-box" }}>
          <rect x="45.5" y="68" width="5.5" height="27" rx="2.75" fill={skin} opacity="0.8" />
          <path d="M43 93h9v4h-9z" fill={accent} opacity="0.85" />
          <path d="M50 96h2.4v5H50z" fill={accent} opacity="0.85" />
        </g>
        <g className="walk-swing-front" style={{ transformBox: "fill-box" }}>
          <rect x="49.5" y="68" width="5.5" height="27" rx="2.75" fill={skin} />
          <path d="M47 93h10v4H47z" fill={accent} />
          <path d="M54.6 96H57v5h-2.4z" fill={accent} />
        </g>
      </g>
      {/* arms + beauty kit case */}
      <rect className="walk-swing-back" style={{ transformBox: "fill-box" }} x="39.5" y="45" width="5" height="21" rx="2.5" fill={outfitDark} opacity="0.7" />
      <rect x="56" y="45" width="5" height="23" rx="2.5" fill={outfit} />
      <g>
        <rect x="57" y="67" width="18" height="14" rx="3" fill={outfitDark} />
        <rect x="57" y="72" width="18" height="2" fill={accent} opacity="0.8" />
        <path d="M62 67c0-2.2 1.6-3.6 4-3.6s4 1.4 4 3.6" stroke={outfitDark} strokeWidth="1.6" fill="none" />
        <circle cx="66" cy="77" r="1.6" fill={accent} />
      </g>
    </g>
  );
}

function LawnPro({ skin, outfit, outfitDark, accent, hair }: any) {
  return (
    <g className="walk-bob">
      <Head skin={skin} hair={hair} cap={accent} />
      <Torso outfit={outfit} outfitDark={outfitDark} />
      <Legs outfit={outfitDark} shoe="#2f2a22" />
      <rect className="walk-swing-back" style={{ transformBox: "fill-box" }} x="39" y="45" width="5.5" height="21" rx="2.75" fill={outfitDark} opacity="0.7" />
      {/* arm holding trimmer over shoulder */}
      <rect x="55" y="42" width="5.5" height="20" rx="2.75" fill={outfit} transform="rotate(-18 57 52)" />
      <g>
        <rect x="36" y="30" width="34" height="4" rx="2" fill={outfitDark} transform="rotate(-14 53 32)" />
        <circle cx="35" cy="35" r="6" fill={accent} opacity="0.85" />
        <circle cx="35" cy="35" r="2.4" fill={outfitDark} />
      </g>
    </g>
  );
}

function Electrician({ skin, outfit, outfitDark, accent, hair }: any) {
  return (
    <g className="walk-bob">
      <Head skin={skin} hair={hair} cap={accent} />
      <Torso outfit={outfit} outfitDark={outfitDark} />
      <Legs outfit={outfitDark} shoe="#2b2630" />
      <rect className="walk-swing-back" style={{ transformBox: "fill-box" }} x="39" y="45" width="5.5" height="21" rx="2.75" fill={outfitDark} opacity="0.7" />
      <rect x="56" y="45" width="5.5" height="23" rx="2.75" fill={outfit} />
      {/* drill / tool bag */}
      <g>
        <rect x="57" y="66" width="17" height="12" rx="3" fill={outfitDark} />
        <rect x="61" y="61" width="4" height="6" rx="2" fill={accent} />
        <path d="M64 70l-3 5h4l-2 5" stroke={accent} strokeWidth="1.6" fill="none" strokeLinejoin="round" />
      </g>
    </g>
  );
}

const PROS: Pro[] = [
  {
    id: "plumber",
    label: "Plumber",
    bubble: "Leaking faucet → Plumber matched",
    skin: "#c98f6b",
    outfit: "#2f57d4",
    outfitDark: "#22409c",
    accent: "#f2643f",
    hair: "#241522",
    Figure: Plumber,
  },
  {
    id: "beauty",
    label: "Beauty Pro",
    bubble: "Need a pedicure → Beauty Pro nearby",
    skin: "#e0ac86",
    outfit: "#f6e7ee",
    outfitDark: "#3a1f3d",
    accent: "#e01f5a",
    hair: "#1f1220",
    Figure: BeautyPro,
  },
  {
    id: "lawn",
    label: "Lawn Care Pro",
    bubble: "Overgrown yard → Lawn pro on the way",
    skin: "#a9764f",
    outfit: "#1f7a5a",
    outfitDark: "#14563f",
    accent: "#f4b942",
    hair: "#20161a",
    Figure: LawnPro,
  },
  {
    id: "electric",
    label: "Electrician",
    bubble: "Mount my TV → Certified pro booked",
    skin: "#8f6141",
    outfit: "#2b2e59",
    outfitDark: "#1b1d3c",
    accent: "#00b8d4",
    hair: "#181220",
    Figure: Electrician,
  },
];

const WALK_MS = 11000;
const PAUSE_MS = 700;

export function ProsOnTheMove() {
  const [index, setIndex] = useState(0);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setTimeout(() => {
      setIndex((i) => (i + 1) % PROS.length);
      setCycle((c) => c + 1);
    }, WALK_MS + PAUSE_MS);
    return () => window.clearTimeout(t);
  }, [cycle]);

  const pro = PROS[index]!;
  const Figure = pro.Figure;

  return (
    <section className="mt-6" aria-label="GPB pros on the move">
      <div
        className="relative overflow-hidden rounded-[24px] border border-border/50 px-4 py-3 md:px-6"
        style={{ backgroundColor: "color-mix(in oklab, var(--card) 86%, var(--background))" }}
      >
        {/* ambient wash */}
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(60% 120% at 15% 100%, color-mix(in oklab, var(--primary) 10%, transparent), transparent 70%), radial-gradient(60% 120% at 85% 0%, color-mix(in oklab, var(--secondary) 10%, transparent), transparent 70%)",
          }}
          aria-hidden="true"
        />

        <div className="relative flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            GPB pros on the move
          </span>
          <span className="hidden text-[11px] text-muted-foreground sm:inline">Matched in minutes, near you</span>
        </div>

        {/* stage */}
        <div className="relative mt-1 h-[104px] md:h-[124px]">
          <div
            key={`${pro.id}-${cycle}`}
            className="walk-across absolute bottom-3 left-0 flex items-end gap-2"
            style={{ ["--walk-duration" as any]: `${WALK_MS}ms` }}
          >
            <svg
              viewBox="0 0 100 104"
              className="h-[76px] w-[74px] md:h-[92px] md:w-[88px]"
              role="img"
              aria-label={`${pro.label} walking`}
            >
              <ellipse cx="52" cy="100" rx="20" ry="3.2" fill="var(--foreground)" opacity="0.10" />
              <Figure skin={pro.skin} outfit={pro.outfit} outfitDark={pro.outfitDark} accent={pro.accent} hair={pro.hair} />
            </svg>

            <div className="mb-3 flex flex-col items-start gap-1.5">
              <span className="rounded-full border border-border/60 bg-card/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-foreground shadow-sm backdrop-blur">
                {pro.label}
              </span>
              <span
                className="walk-bubble max-w-[190px] rounded-2xl rounded-bl-sm border border-primary/25 bg-card/95 px-3 py-1.5 text-[11px] font-medium leading-snug text-foreground shadow-sm backdrop-blur md:max-w-none"
                style={{ ["--walk-duration" as any]: `${WALK_MS}ms` }}
              >
                {pro.bubble}
              </span>
            </div>
          </div>

          {/* ground line */}
          <div
            className="absolute bottom-3 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, color-mix(in oklab, var(--foreground) 14%, transparent), transparent)" }}
            aria-hidden="true"
          />
        </div>
      </div>
    </section>
  );
}

export default ProsOnTheMove;
