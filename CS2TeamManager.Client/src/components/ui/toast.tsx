import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CircleAlert, CircleCheck, X } from 'lucide-react';
import { cx } from '../../lib/cx';
import { ToastContext, type ToastApi } from './toast-context';

const AUTO_DISMISS_MS = 5000;
const MAX_VISIBLE = 4;

interface ToastItem {
    id: number;
    tone: 'success' | 'error';
    message: string;
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const nextId = useRef(0);

    const dismiss = useCallback((id: number) => {
        setToasts(current => current.filter(toast => toast.id !== id));
    }, []);

    const api = useMemo<ToastApi>(() => {
        const add = (tone: ToastItem['tone'], message: string) => {
            const id = ++nextId.current;
            setToasts(current => [...current, { id, tone, message }].slice(-MAX_VISIBLE));
        };
        return {
            success: message => add('success', message),
            error: message => add('error', message),
        };
    }, []);

    return (
        <ToastContext.Provider value={api}>
            {children}
            {/* Always mounted: a live region must exist before its content changes to be announced. */}
            <div
                role="region"
                aria-label="Notifications"
                aria-live="polite"
                className="pointer-events-none fixed inset-x-4 bottom-20 z-50 flex flex-col items-end gap-2 sm:left-auto sm:w-96 lg:bottom-6"
            >
                <AnimatePresence initial={false}>
                    {toasts.map(toast => (
                        <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

function Toast({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
    const [paused, setPaused] = useState(false);
    const isError = toast.tone === 'error';

    useEffect(() => {
        if (isError || paused) return;
        const timer = setTimeout(() => onDismiss(toast.id), AUTO_DISMISS_MS);
        return () => clearTimeout(timer);
    }, [isError, paused, onDismiss, toast.id]);

    return (
        <motion.div
            layout="position"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            role={isError ? 'alert' : undefined}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            className="pointer-events-auto flex w-full items-start gap-3 rounded-md border border-line border-l-4 bg-raised p-3 text-sm text-fg shadow-overlay"
            style={{ borderLeftColor: isError ? 'var(--rs-danger-text)' : 'var(--rs-success-text)' }}
        >
            <span className={cx('mt-0.5 shrink-0', isError ? 'text-danger' : 'text-success')}>
                {isError ? <CircleAlert className="size-4" aria-hidden="true" /> : <CircleCheck className="size-4" aria-hidden="true" />}
            </span>
            <p className="min-w-0 flex-1 break-words">{toast.message}</p>
            <button type="button" onClick={() => onDismiss(toast.id)} aria-label="Dismiss notification" className="-m-1 flex size-7 shrink-0 items-center justify-center rounded text-fg-muted hover:bg-hover hover:text-fg">
                <X className="size-4" aria-hidden="true" />
            </button>
        </motion.div>
    );
}
