/** Empty state — quiet, bordered, no illustration clutter */
export default function Empty({ icon: Icon, title, hint, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-14 px-6 ${className}`}>
      {Icon && (
        <div className="w-11 h-11 rounded-lg border border-stone-200 bg-stone-50 flex items-center justify-center text-stone-400 mb-4">
          <Icon size={20} strokeWidth={1.8} />
        </div>
      )}
      <p className="text-[14px] font-medium text-ink">{title}</p>
      {hint && <p className="mt-1 text-[13px] text-stone-500 max-w-sm leading-relaxed">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
