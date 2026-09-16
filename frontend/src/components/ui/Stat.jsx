/** Big-number stat block — mono label over a tabular figure */
export default function Stat({ label, value, sub, className = '' }) {
  return (
    <div className={className}>
      <p className="micro">{label}</p>
      <p className="mt-2 font-display text-[34px] leading-none font-semibold text-ink tnum">
        {value}
      </p>
      {sub && <p className="mt-1.5 text-[12px] text-stone-500">{sub}</p>}
    </div>
  );
}
