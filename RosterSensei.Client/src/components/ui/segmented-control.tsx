import { useId, type ReactNode } from 'react';
import { cx } from '../../lib/cx';

export interface SegmentedOption<T> {
    value: T;
    label: ReactNode;
    disabled?: boolean;
}

export interface SegmentedControlProps<T extends string | number> {
    /** Names the group for screen readers, and is shown above it unless `hideLabel` is set. */
    label: string;
    hideLabel?: boolean;
    value: T;
    options: readonly SegmentedOption<T>[];
    onChange: (value: T) => void;
    disabled?: boolean;
    className?: string;
}

/**
 * Pick exactly one of a few visible options. Built on native radio buttons, so arrow keys,
 * form semantics and screen reader support ("2 of 4") all come from the browser.
 */
export function SegmentedControl<T extends string | number>({
    label,
    hideLabel = false,
    value,
    options,
    onChange,
    disabled = false,
    className,
}: SegmentedControlProps<T>) {
    const name = useId();

    return (
        <fieldset disabled={disabled} className={cx('min-w-0', className)}>
            <legend className={cx('mb-1.5 text-sm font-medium text-fg-muted', hideLabel && 'sr-only')}>{label}</legend>
            <div className="inline-flex max-w-full flex-wrap gap-1 rounded-md border border-line bg-sunken p-1">
                {options.map(option => {
                    const selected = option.value === value;
                    return (
                        <label key={String(option.value)} className="relative">
                            <input
                                type="radio"
                                name={name}
                                checked={selected}
                                disabled={option.disabled}
                                onChange={() => onChange(option.value)}
                                className="peer sr-only"
                            />
                            <span
                                className={cx(
                                    'flex h-9 items-center rounded px-3 text-sm font-semibold transition-colors duration-150 pointer-coarse:h-10',
                                    'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-(--rs-focus)',
                                    'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
                                    selected ? 'bg-accent text-on-accent' : 'cursor-pointer text-fg-muted hover:bg-hover hover:text-fg',
                                )}
                            >
                                {option.label}
                            </span>
                        </label>
                    );
                })}
            </div>
        </fieldset>
    );
}

export interface ToggleChipProps {
    pressed: boolean;
    onToggle: () => void;
    disabled?: boolean;
    children: ReactNode;
}

/** An independent on/off choice, for picking several items from a set. */
export function ToggleChip({ pressed, onToggle, disabled = false, children }: ToggleChipProps) {
    return (
        <button
            type="button"
            aria-pressed={pressed}
            disabled={disabled}
            onClick={onToggle}
            className={cx(
                'inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium tabular-nums transition-colors duration-150 pointer-coarse:h-11',
                'disabled:cursor-not-allowed disabled:opacity-50',
                pressed
                    ? 'border-accent bg-accent-soft text-fg'
                    : 'border-line-strong text-fg-muted enabled:hover:bg-hover enabled:hover:text-fg',
            )}
        >
            {children}
        </button>
    );
}
