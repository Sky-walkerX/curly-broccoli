import { useEffect, useRef, useState } from "react";

// Eased integer count-up. Re-runs whenever `value` changes; respects reduced motion.
export function useCountUp(value, duration = 900) {
  const [display, setDisplay] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setDisplay(value); return; }
    const start = performance.now();
    const a = from.current, b = value;
    let raf;
    const step = (t) => {
      const k = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      setDisplay(Math.round(a + (b - a) * eased));
      if (k < 1) raf = requestAnimationFrame(step);
      else from.current = b;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return display;
}
