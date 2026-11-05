import type { ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import { cx } from '../../lib/cx';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

const TONES: Record<AlertTone, { classes: string; icon: ReactNode }> = {
    info: { classes: 'border-line-strong bg-neutral-soft text-fg', icon: <Info className="size-4" aria-hidden="true" /> },
    success: { classes: 'border-success bg-success-soft text-success', icon: <CircleCheck className="size-4" aria-hidden="true" /> },
    warning: { classes: 'border-warning bg-warning-soft text-warning', icon: <TriangleAlert className="size-4" aria-hidden="true" /> },
    danger: { classes: 'border-danger bg-danger-soft text-danger', icon: <CircleAlert className="size-4" aria-hidden="true" /> },
};

export interface AlertProps {
    tone?: AlertTone;
    title?: string;
    /** Shows a dismiss button when provided. */
    onDismiss?: () => void;
    className?: string;
    children: ReactNode;
}

/** Inline feedback tied to a place on the page. For feedback that isn't, use a toast. */
export function Alert({ tone = 'info', title, onDismiss, className, children }: AlertProps) {
    const { classes, icon } = TONES[tone];
    return (
        // A danger alert interrupts a screen reader immediately; the others wait their turn.
        <div role={tone === 'danger' ? 'alert' : 'status'} className={cx('flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-sm', classes, className)}>
            <span className="mt-0.5 shrink-0">{icon}</span>
            <div className="min-w-0 flex-1 break-words">
                {title && <p className="font-semibold">{title}</p>}
                {children}
            </div>
            {onDismiss && (
                <button type="button" onClick={onDismiss} aria-label="Dismiss" className="-m-1 flex size-7 shrink-0 items-center justify-center rounded hover:bg-hover">
                    <X className="size-4" aria-hidden="true" />
                </button>
            )}
        </div>
    );
}
