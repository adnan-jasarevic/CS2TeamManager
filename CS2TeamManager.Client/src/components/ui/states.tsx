import type { ReactNode } from 'react';
import { CircleAlert, RotateCw } from 'lucide-react';
import { cx } from '../../lib/cx';
import { Button } from './button';

export interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    /** Say what will appear here, or how to fill it. */
    description?: ReactNode;
    action?: ReactNode;
    /** Tighter spacing, for use inside a card next to other content. */
    compact?: boolean;
    className?: string;
}

export function EmptyState({ icon, title, description, action, compact = false, className }: EmptyStateProps) {
    return (
        <div className={cx('flex flex-col items-center px-6 text-center', compact ? 'py-8' : 'py-14', className)}>
            {icon && (
                <span aria-hidden="true" className="mb-4 flex size-12 items-center justify-center rounded-full bg-neutral-soft text-fg-muted [&>svg]:size-6">
                    {icon}
                </span>
            )}
            <p className="font-display text-base font-bold text-fg">{title}</p>
            {description && <p className="mt-1 max-w-sm text-sm text-fg-muted">{description}</p>}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}

export interface ErrorStateProps {
    title?: string;
    message?: string;
    /** Shows a retry button. Leave it out only if trying again can't help. */
    onRetry?: () => void;
    retrying?: boolean;
    compact?: boolean;
    className?: string;
}

/** Stands in for content that failed to load, and offers a way out. */
export function ErrorState({ title = "That didn't load", message, onRetry, retrying = false, compact = false, className }: ErrorStateProps) {
    return (
        <div role="alert" className={cx('flex flex-col items-center px-6 text-center', compact ? 'py-8' : 'py-14', className)}>
            <span aria-hidden="true" className="mb-4 flex size-12 items-center justify-center rounded-full bg-danger-soft text-danger">
                <CircleAlert className="size-6" />
            </span>
            <p className="font-display text-base font-bold text-fg">{title}</p>
            {message && <p className="mt-1 max-w-sm text-sm break-words text-fg-muted">{message}</p>}
            {onRetry && (
                <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry} loading={retrying} leftIcon={<RotateCw className="size-4" aria-hidden="true" />}>
                    Try again
                </Button>
            )}
        </div>
    );
}
