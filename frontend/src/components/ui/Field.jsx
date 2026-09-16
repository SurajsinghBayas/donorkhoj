/**
 * Form primitives. Labels use the mono micro style —
 * reads like a clinical document, keeps forms scannable.
 */

export function Field({ label, hint, error, children, className = '' }) {
  return (
    <div className={className}>
      {label && <label className="micro block mb-1.5">{label}</label>}
      {children}
      {error ? (
        <p className="mt-1.5 text-[12px] text-blood-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[12px] text-stone-400">{hint}</p>
      ) : null}
    </div>
  );
}

const inputBase = `
  w-full h-10 px-3 bg-white text-sm text-ink
  border border-stone-300 rounded-md
  placeholder:text-stone-400
  hover:border-stone-400
  focus:border-blood-600 focus:ring-2 focus:ring-blood-600/15 focus:outline-none
  transition-colors disabled:bg-stone-50 disabled:text-stone-400
`;

export function Input({ unit, className = '', ...props }) {
  if (unit) {
    return (
      <div className="relative">
        <input className={`${inputBase} pr-20 tnum ${className}`} {...props} />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10.5px] text-stone-400 pointer-events-none text-right">
          {unit}
        </span>
      </div>
    );
  }
  return <input className={`${inputBase} ${className}`} {...props} />;
}

export function Select({ options = [], placeholder, className = '', ...props }) {
  return (
    <div className="relative">
      <select
        className={`${inputBase} appearance-none cursor-pointer pr-9 ${className}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) =>
          typeof o === 'string' ? (
            <option key={o} value={o}>{o}</option>
          ) : (
            <option key={o.value} value={o.value}>{o.label}</option>
          )
        )}
      </select>
      <svg
        className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400"
        width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

export function Textarea({ className = '', rows = 3, ...props }) {
  return (
    <textarea
      rows={rows}
      className={`${inputBase} h-auto py-2.5 resize-none ${className}`}
      {...props}
    />
  );
}

/** Segmented pill radio group — used for status choices in the wizard */
export function ChoiceGroup({ options, value, onChange, columns = 3 }) {
  return (
    <div
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`h-9 px-2 rounded-md border text-[13px] font-medium transition-colors cursor-pointer
              ${active
                ? 'border-ink bg-ink text-white'
                : 'border-stone-300 bg-white text-stone-600 hover:border-stone-400 hover:text-ink'
              }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
