"use client";

// Animated conic "halo" ring with the private baseline score in the center.
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
  return (
    <div
      className="relative grid place-items-center"
      style={{ width: size, height: size }}
    >
      <div
        className="halo-ring animate-spin-slow rounded-full"
        style={{
          width: size,
          height: size,
          mask: `radial-gradient(farthest-side, transparent calc(100% - 12px), #000 calc(100% - 11px))`,
          WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - 12px), #000 calc(100% - 11px))`,
          opacity: 0.25,
        }}
      />
      {/* progress arc */}
      <svg className="absolute -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 6}
          fill="none"
          stroke="var(--border)"
          strokeWidth="6"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 6}
          fill="none"
          stroke="url(#halo-grad)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={2 * Math.PI * (size / 2 - 6)}
          strokeDashoffset={2 * Math.PI * (size / 2 - 6) * (1 - pct / 100)}
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
        <defs>
          <linearGradient id="halo-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--halo-from)" />
            <stop offset="50%" stopColor="var(--halo-via)" />
            <stop offset="100%" stopColor="var(--halo-to)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute text-center">
        <div className="font-mono text-5xl font-bold halo-text leading-none">{pct}</div>
        <div className="mt-1 text-[11px] uppercase tracking-widest text-muted">{label}</div>
        {potential != null && (
          <div className="mt-2 text-xs text-muted">
            potential <span className="text-foreground font-semibold">{potential}</span>
          </div>
        )}
      </div>
    </div>
  );
}
