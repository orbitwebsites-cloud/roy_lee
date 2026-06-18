"use client";

// The centerpiece: a gold halo arc with the private baseline score.
// Refined, not gimmicky — a soft static glow + a very slow faint outer halo.
export default function ScoreRing({
  score,
  potential,
  size = 200,
  label = "HALO score",
}: {
  score: number;
  potential?: number;
  size?: number;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, score));
  const r = size / 2 - 7;
  const circ = 2 * Math.PI * r;

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      {/* faint rotating outer halo */}
      <div
        className="halo-ring animate-spin-slow animate-glow absolute rounded-full"
        style={{
          width: size + 14,
          height: size + 14,
          mask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))",
          WebkitMask:
            "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))",
          opacity: 0.4,
          filter: "blur(0.5px)",
        }}
      />
      <svg className="absolute -rotate-90" width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth="7" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#halo-grad)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct / 100)}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.22,1,0.36,1)" }}
        />
        <defs>
          <linearGradient id="halo-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--halo-from)" />
            <stop offset="55%" stopColor="var(--halo-via)" />
            <stop offset="100%" stopColor="var(--halo-to)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute text-center">
        <div className="halo-text tabular text-6xl font-semibold leading-none">{pct}</div>
        <div className="mt-2 text-[10px] font-medium uppercase tracking-[0.25em] text-faint">
          {label}
        </div>
        {potential != null && (
          <div className="mt-2.5 text-xs text-muted">
            ceiling <span className="tabular font-semibold text-foreground">{potential}</span>
          </div>
        )}
      </div>
    </div>
  );
}
