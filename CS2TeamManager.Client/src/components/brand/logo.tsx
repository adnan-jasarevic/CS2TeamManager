import { useId } from 'react';
import { cx } from '../../lib/cx';

interface LogoMarkProps {
    /** Width and height, in pixels or a CSS length such as "100%". */
    size?: number | string;
    className?: string;
}

/**
 * A rising sun disc whose lower half is cut into roster lines. The cuts are transparent, so the
 * mark sits on any surface in either theme. It's deliberately a plain disc: the rayed sun has a
 * painful history in much of Asia, where a lot of CS2 is played, so never add rays to it.
 */
export function LogoMark({ size = 32, className }: LogoMarkProps) {
    const maskId = useId();
    return (
        <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
            <mask id={maskId}>
                <rect width="32" height="32" fill="#fff" />
                <rect y="17" width="32" height="1.5" fill="#000" />
                <rect y="21" width="32" height="2" fill="#000" />
                <rect y="25.5" width="32" height="2.5" fill="#000" />
            </mask>
            <circle cx="16" cy="16" r="15" fill="var(--rs-accent)" mask={`url(#${maskId})`} />
        </svg>
    );
}

interface LogoProps {
    size?: 'sm' | 'md';
    className?: string;
}

export function Logo({ size = 'md', className }: LogoProps) {
    return (
        <span className={cx('inline-flex items-center gap-2.5', className)}>
            <LogoMark size={size === 'sm' ? 28 : 34} />
            <span className={cx('font-display font-black tracking-tight text-fg leading-none', size === 'sm' ? 'text-base' : 'text-xl')}>
                Roster <span className="text-accent-text">Sensei</span>
            </span>
        </span>
    );
}
