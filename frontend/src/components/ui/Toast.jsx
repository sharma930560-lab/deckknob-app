/**
 * Toast — UI primitive
 * Fixed bottom-center toast notification with slide-up/slide-down animation.
 * Auto-dismisses after 3 seconds.
 *
 * Exports:
 *   - ToastProvider  — wraps the app; renders the toast portal
 *   - useToast       — hook to trigger toasts from any component
 *
 * Usage:
 *   // In App.jsx (or main.jsx):
 *   <ToastProvider>
 *     <App />
 *   </ToastProvider>
 *
 *   // In any component:
 *   const { showToast } = useToast();
 *   showToast('Copied to clipboard!', 'success');
 *
 * Requirements: 1.8, 7.1, 14.3
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

// ── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext(null);

// ── Type → style map ─────────────────────────────────────────────────────────

const typeStyles = {
  success: 'bg-neon-lime text-black',
  error:   'bg-red-600 text-white',
  info:    'bg-zinc-800 text-zinc-100 border border-white/10',
};

const typeIcons = {
  success: '✓',
  error:   '✕',
  info:    'ℹ',
};

// ── Internal Toast display component ─────────────────────────────────────────

function ToastDisplay({ message, type = 'info', visible, onDismiss }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      onClick={onDismiss}
      className={[
        // Position
        'fixed bottom-6 left-1/2 z-[9999]',
        // Layout
        'flex items-center gap-2',
        'px-4 py-2.5 rounded-full',
        // Typography
        'text-sm font-heading font-semibold',
        // Cursor
        'cursor-pointer select-none',
        // Shadow
        'shadow-lg',
        // Type colour
        typeStyles[type] ?? typeStyles.info,
        // Slide animation — translate-x centres via -translate-x-1/2 (always on),
        // slide-up on appear, slide-down on dismiss
        '-translate-x-1/2 transition-all duration-300',
        visible
          ? 'translate-y-0 opacity-100'
          : 'translate-y-4 opacity-0 pointer-events-none',
      ].join(' ')}
    >
      <span aria-hidden="true">{typeIcons[type] ?? typeIcons.info}</span>
      <span>{message}</span>
    </div>
  );
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({
    message: '',
    type: 'info',
    visible: false,
  });

  const timerRef = useRef(null);

  const showToast = useCallback((message, type = 'info') => {
    // Clear any existing auto-dismiss timer
    if (timerRef.current) clearTimeout(timerRef.current);

    setToast({ message, type, visible: true });

    // Auto-dismiss after 3 seconds
    timerRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3000);
  }, []);

  const dismissToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  // Cleanup on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastDisplay
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onDismiss={dismissToast}
      />
    </ToastContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a <ToastProvider>');
  }
  return ctx;
}

// ── Default export (standalone component for direct use) ─────────────────────

export default function Toast({ message, type = 'info', visible, onDismiss }) {
  return (
    <ToastDisplay
      message={message}
      type={type}
      visible={visible}
      onDismiss={onDismiss}
    />
  );
}
