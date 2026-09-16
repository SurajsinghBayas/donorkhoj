export default function Card({ children, className = '', pad = true }) {
  return (
    <div
      className={`bg-white border border-stone-200 rounded-lg ${pad ? 'p-5' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, description, action, className = '' }) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div>
        <h3 className="text-[15px] font-semibold text-ink leading-snug">{title}</h3>
        {description && (
          <p className="mt-0.5 text-[13px] text-stone-500 leading-relaxed">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/** Numbered section heading — "01 · Basics" pattern used in forms/pages */
export function SectionHeading({ index, title, description, className = '' }) {
  return (
    <div className={`flex items-baseline gap-3 ${className}`}>
      {index != null && (
        <span className="font-mono text-[11px] font-medium text-blood-600 tracking-wider">
          {String(index).padStart(2, '0')}
        </span>
      )}
      <div>
        <h3 className="font-display text-[17px] font-semibold text-ink">{title}</h3>
        {description && <p className="mt-0.5 text-[13px] text-stone-500">{description}</p>}
      </div>
    </div>
  );
}
