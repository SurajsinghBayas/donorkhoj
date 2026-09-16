export default function Spinner({ size = 18, light = false, className = '' }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 shrink-0 ${
        light ? 'border-white/30 border-t-white' : 'border-stone-300 border-t-ink'
      } ${className}`}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  );
}
