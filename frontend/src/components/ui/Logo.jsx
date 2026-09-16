export function LogoMark({ size = 28, className = '' }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-[7px] bg-blood-600 shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size * 0.62}
        height={size * 0.62}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2.5 12h3.6l2.4-6.2 3.4 12.4 2.6-8.4 1.4 2.2h5.6" />
      </svg>
    </span>
  );
}

export default function Logo({ size = 28, dark = false, withWord = true }) {
  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      <LogoMark size={size} />
      {withWord && (
        <span
          className={`font-display text-[19px] font-semibold tracking-tight leading-none ${
            dark ? 'text-white' : 'text-ink'
          }`}
        >
          Donor<span className="text-blood-600">Khoj</span>
        </span>
      )}
    </span>
  );
}
