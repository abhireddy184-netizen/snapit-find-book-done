import { useEffect, useState } from "react";

const KEY = "gp-entrance-rise-v1";

/**
 * One-time-per-session entrance flourish: the genuine GPA app icon rises and
 * flies upward, then disappears. Purely decorative — never intercepts taps,
 * skipped entirely when the visitor prefers reduced motion.
 */
export function EntranceRise() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY)) return;
      sessionStorage.setItem(KEY, "1");
    } catch {
      return; // storage unavailable: skip rather than replay on every page
    }
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    setShow(true);
    const t = window.setTimeout(() => setShow(false), 2000);
    return () => window.clearTimeout(t);
  }, []);

  if (!show) return null;
  return (
    <div aria-hidden="true" className="gp-rise-layer">
      <div className="gp-rise">
        <span className="gp-rise-trail" />
        <img src="/getpros-gpa.svg" alt="" width={56} height={56} className="gp-rise-icon" decoding="async" />
      </div>
    </div>
  );
}
