import Spinner from './Spinner';

const VARIANTS = {
  primary:
    'bg-ink text-white hover:bg-stone-700 active:bg-stone-900 border border-transparent',
  accent:
    'bg-blood-600 text-white hover:bg-blood-700 active:bg-blood-800 border border-transparent',
  outline:
    'bg-white text-ink border border-stone-300 hover:border-stone-400 hover:bg-stone-50',
  ghost:
    'text-stone-500 hover:text-ink hover:bg-stone-100 border border-transparent',
  danger:
    'bg-white text-blood-700 border border-blood-200 hover:bg-blood-50 hover:border-blood-300',
};

const SIZES = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-[15px] gap-2',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  children,
  className = '',
  disabled,
  ...props
}) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium rounded-md transition-colors duration-150
        disabled:opacity-50 disabled:pointer-events-none cursor-pointer whitespace-nowrap
        ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Spinner size={15} light={variant === 'primary' || variant === 'accent'} />
      ) : (
        Icon && <Icon size={15} strokeWidth={2.2} />
      )}
      {children}
    </button>
  );
}
