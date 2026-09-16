/**
 * Circular match-score indicator.
 * Stroke color follows the compatibility tone.
 */
const TONE_STROKE = {
  green: '#067647',
  amber: '#B54708',
  red: '#B42318',
  stone: '#A8A29E',
};

export default function ScoreRing({ score = 0, size = 88, stroke = 6, tone = 'green', label }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, score));
  const color = TONE_STROKE[tone] || TONE_STROKE.stone;

  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EFEDEA" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tnum font-semibold text-ink leading-none" style={{ fontSize: size * 0.24 }}>
          {Math.round(clamped * 100)}
          <span className="text-[0.6em] text-stone-400 font-medium">%</span>
        </span>
        {label && (
          <span className="micro mt-1" style={{ fontSize: 9 }}>{label}</span>
        )}
      </div>
    </div>
  );
}
