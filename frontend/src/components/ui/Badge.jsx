const TONES = {
  stone: 'bg-stone-100 text-stone-600 border-stone-200',
  red: 'bg-blood-50 text-blood-700 border-blood-200',
  green: 'bg-leaf-50 text-leaf-700 border-leaf-100',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  blue: 'bg-sky-50 text-sky-700 border-sky-200',
  ink: 'bg-ink text-white border-ink',
};

export default function Badge({ tone = 'stone', dot = false, pulse = false, children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5
        text-[11px] font-medium leading-5 whitespace-nowrap ${TONES[tone]} ${className}`}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full bg-current ${pulse ? 'live-dot' : ''}`} />
      )}
      {children}
    </span>
  );
}
