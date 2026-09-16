/** Consistent page heading: eyebrow, serif title, actions on the right */
export default function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-stone-200">
      <div className="max-w-2xl">
        {eyebrow && <p className="micro mb-2">{eyebrow}</p>}
        <h1 className="font-display text-[28px] leading-tight font-semibold text-ink tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-[14px] text-stone-500 leading-relaxed">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2.5">{actions}</div>}
    </div>
  );
}
