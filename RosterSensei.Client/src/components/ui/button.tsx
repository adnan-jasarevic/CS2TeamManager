import type { ComponentPropsWithRef, MouseEvent, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { cx } from '../../lib/cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonStyleProps {
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
}

const VARIANTS: Record<ButtonVariant, string> = {
    primary: 'bg-accent text-on-accent hover:bg-accent-hover',
    secondary: 'border border-line-strong bg-transparent text-fg hover:bg-hover',
    ghost: 'bg-transparent text-fg-muted hover:bg-hover hover:text-fg',
    danger: 'border border-danger bg-danger-soft text-danger hover:bg-accent hover:border-accent hover:text-on-accent',
};

// Small buttons grow to a 44px target on touch screens; a mouse can use the tighter size.
const SIZES: Record<ButtonSize, string> = {
    sm: 'h-9 px-3 text-sm gap-1.5 pointer-coarse:h-11',
    md: 'h-11 px-4 text-sm gap-2',
    lg: 'h-12 px-6 text-base gap-2',
};

const buttonClasses = ({ variant = 'primary', size = 'md', fullWidth = false }: ButtonStyleProps) =>
    cx(
        'inline-flex shrink-0 items-center justify-center rounded-md font-semibold whitespace-nowrap select-none',
        'transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.98]',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
        'aria-disabled:cursor-not-allowed aria-disabled:active:scale-100',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
    );

export interface ButtonProps extends ComponentPropsWithRef<'button'>, ButtonStyleProps {
    /** Shows a spinner and ignores clicks. Unlike `disabled`, the button keeps keyboard focus. */
    loading?: boolean;
    /** Replaces the label while loading, e.g. "Saving...". */
    loadingText?: string;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
}

export function Button({
    variant,
    size,
    fullWidth,
    loading = false,
    loadingText,
    leftIcon,
    rightIcon,
    type = 'button',
    className,
    children,
    onClick,
    ...props
}: ButtonProps) {
    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
        if (loading) {
            event.preventDefault(); // Also stops a double submit from a type="submit" button.
            return;
        }
        onClick?.(event);
    };

    return (
        <button
            type={type}
            aria-busy={loading || undefined}
            aria-disabled={loading || undefined}
            onClick={handleClick}
            className={cx(buttonClasses({ variant, size, fullWidth }), className)}
            {...props}
        >
            {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : leftIcon}
            {loading && loadingText ? loadingText : children}
            {!loading && rightIcon}
        </button>
    );
}

export interface LinkButtonProps extends LinkProps, ButtonStyleProps {
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
}

/** A router link that looks like a button. Use it whenever the action is navigation. */
export function LinkButton({ variant = 'secondary', size, fullWidth, leftIcon, rightIcon, className, children, ...props }: LinkButtonProps) {
    return (
        <Link className={cx(buttonClasses({ variant, size, fullWidth }), className)} {...props}>
            {leftIcon}
            {children}
            {rightIcon}
        </Link>
    );
}

export interface IconButtonProps extends Omit<ComponentPropsWithRef<'button'>, 'aria-label' | 'children'> {
    /** Required: an icon alone says nothing to a screen reader. Also shown as the tooltip. */
    label: string;
    icon: ReactNode;
    size?: 'sm' | 'md';
    /** A small count shown on the corner of the button. Hidden at 0. */
    badge?: number;
}

export function IconButton({ label, icon, size = 'md', badge, type = 'button', className, title, ...props }: IconButtonProps) {
    return (
        <button
            type={type}
            aria-label={label}
            title={title ?? label}
            className={cx(
                'relative inline-flex shrink-0 items-center justify-center rounded-md text-fg-muted',
                'transition-colors duration-150 hover:bg-hover hover:text-fg',
                'disabled:cursor-not-allowed disabled:opacity-50',
                size === 'sm' ? 'size-9 pointer-coarse:size-11' : 'size-11',
                className,
            )}
            {...props}
        >
            {icon}
            {badge !== undefined && badge > 0 && (
                <span aria-hidden="true" className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[0.625rem] leading-none font-bold text-on-accent tabular-nums">
                    {badge > 99 ? '99+' : badge}
                </span>
            )}
        </button>
    );
}
