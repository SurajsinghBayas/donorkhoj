import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, subtitle, children, wide = false }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div className="absolute inset-0 bg-ink/45" onClick={onClose} />
          <motion.div
            className={`relative bg-white rounded-lg border border-stone-200 shadow-2xl w-full ${
              wide ? 'max-w-3xl' : 'max-w-lg'
            } max-h-[88vh] flex flex-col`}
            initial={{ opacity: 0, y: 14, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.99 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {(title || onClose) && (
              <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-stone-100">
                <div>
                  {title && (
                    <h2 className="font-display text-[19px] font-semibold text-ink leading-tight">
                      {title}
                    </h2>
                  )}
                  {subtitle && <p className="mt-1 text-[13px] text-stone-500">{subtitle}</p>}
                </div>
                {onClose && (
                  <button
                    onClick={onClose}
                    className="p-1.5 -m-1 rounded-md text-stone-400 hover:text-ink hover:bg-stone-100 transition-colors cursor-pointer"
                    aria-label="Close"
                  >
                    <X size={17} />
                  </button>
                )}
              </div>
            )}
            <div className="overflow-y-auto scroll-thin">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
