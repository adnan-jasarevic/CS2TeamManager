import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cx } from '../../lib/cx';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

const BADGE_TONES: Record<BadgeTone, string> = {
    neutral: 'bg-neutral-soft text-fg-muted',
    accent: 'bg-accent-soft text-accent-text',
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
    danger: 'bg-danger-soft text-danger',
};

export interface BadgeProps {
    tone?: BadgeTone;
    /** Pair colour with an icon wherever the meaning matters, so it never relies on colour alone. */
    icon?: ReactNode;
    className?: string;
    children: ReactNode;
}

export function Badge({ tone = 'neutral', icon, className, children }: BadgeProps) {
    return (
        <span className={cx('inline-flex h-6 items-center justify-center gap-1 rounded px-2 text-xs font-bold whitespace-nowrap', BADGE_TONES[tone], className)}>
            {icon && <span className="[&>svg]:size-3.5" aria-hidden="true">{icon}</span>}
            {children}
        </span>
    );
}

export function Card({ className, children, ...props }: ComponentPropsWithRef<'section'>) {
    return (
        <section className={cx('rounded-lg border border-line bg-surface', className)} {...props}>
            {children}
        </section>
    );
}

export interface CardHeaderProps {
    title: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
    className?: string;
}

export function CardHeader({ title, description, action, className }: CardHeaderProps) {
    return (
        <header className={cx('flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-5 pb-4', className)}>
            <div className="min-w-0">
                <h2 className="text-base font-bold text-fg">{title}</h2>
                {description && <p className="mt-0.5 text-sm text-fg-subtle">{description}</p>}
            </div>
            {action}
        </header>
    );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
    return (
        <span aria-hidden="true" className={cx('flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft font-display font-bold text-accent-text', className)}>
            {name.trim().charAt(0).toUpperCase() || '?'}
        </span>
    );
}

export function Skeleton({ className }: { className?: string }) {
    return <div className={cx('rs-skeleton rounded', className)} />;
}

export interface LoadingRegionProps {
    /** What's loading, read out once by screen readers, e.g. "Loading matches". */
    label: string;
    className?: string;
    children: ReactNode;
}

/** Wraps skeletons: announces the label once and hides the meaningless placeholder shapes. */
export function LoadingRegion({ label, className, children }: LoadingRegionProps) {
    return (
        <div role="status" className={className}>
            <span className="sr-only">{label}</span>
            <div aria-hidden="true" className="contents">{children}</div>
        </div>
    );
}

/** A row of StatTiles, as a description list so each value stays tied to its label. */
export function StatGrid({ className, children }: { className?: string; children: ReactNode }) {
    return <dl className={cx('grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4', className)}>{children}</dl>;
}

export interface StatTileProps {
    label: string;
    value: ReactNode;
    icon?: ReactNode;
    /** Shown after the value in smaller text, e.g. "65%" next to "Inferno". */
    hint?: ReactNode;
    /** Keeps the tile's size while its value loads, so the layout doesn't jump. */
    loading?: boolean;
}

export function StatTile({ label, value, icon, hint, loading = false }: StatTileProps) {
    return (
        <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-line bg-surface p-4 lg:p-5">
            <dt className="flex items-center justify-between gap-2 text-sm font-medium text-fg-muted">
                <span className="min-w-0 truncate">{label}</span>
                {icon && <span className="shrink-0 text-fg-subtle [&>svg]:size-4" aria-hidden="true">{icon}</span>}
            </dt>
            <dd className="flex min-h-9 flex-wrap items-baseline gap-x-2">
                {loading ? (
                    <Skeleton className="h-8 w-20" />
                ) : (
                    <>
                        <span className="min-w-0 font-display text-2xl leading-9 font-black break-words text-fg tabular-nums lg:text-3xl">{value}</span>
                        {hint && <span className="text-sm text-fg-subtle tabular-nums">{hint}</span>}
                    </>
                )}
            </dd>
        </div>
    );
}
