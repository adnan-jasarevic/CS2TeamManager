import { createContext, useContext } from 'react';

export interface ToastApi {
    /** Dismisses itself after a few seconds, pausing while hovered or focused. */
    success: (message: string) => void;
    /** Stays until dismissed: an error shouldn't vanish before it has been read. */
    error: (message: string) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used inside <ToastProvider>.');
    return context;
}
