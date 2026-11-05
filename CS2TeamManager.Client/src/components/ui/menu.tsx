import { useContext, type KeyboardEvent, type ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { Popover, type PopoverTriggerProps } from './popover';
import { PopoverCloseContext } from './popover-context';

export interface MenuProps {
    /** Names the menu for screen readers, e.g. "Actions for s1mple". */
    label: string;
    renderTrigger: (props: PopoverTriggerProps) => ReactNode;
    align?: 'start' | 'end';
    children: ReactNode;
}

/** Follows the ARIA menu pattern: arrows, Home and End move, Enter selects, Esc closes, Tab leaves. */
export function Menu({ label, renderTrigger, align, children }: MenuProps) {
    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'));
        const current = items.indexOf(document.activeElement as HTMLElement);
        const targets: Record<string, number> = {
            ArrowDown: (current + 1) % items.length,
            ArrowUp: (current - 1 + items.length) % items.length,
            Home: 0,
            End: items.length - 1,
        };
        if (event.key in targets) {
            event.preventDefault();
            items[targets[event.key]]?.focus();
        }
    };

    return (
        <Popover label={label} role="menu" align={align} renderTrigger={renderTrigger} onPanelKeyDown={handleKeyDown} className="w-60">
            {children}
        </Popover>
    );
}

export interface MenuItemProps {
    onSelect: () => void;
    icon?: ReactNode;
    tone?: 'default' | 'danger';
    /** Stays focusable and readable, so the reason it's unavailable can still be reached. */
    disabled?: boolean;
    /** Smaller text under the label, e.g. why the item is disabled. */
    hint?: string;
    children: ReactNode;
}

export function MenuItem({ onSelect, icon, tone = 'default', disabled = false, hint, children }: MenuItemProps) {
    const close = useContext(PopoverCloseContext);

    const handleClick = () => {
        if (disabled) return;
        // Close first: focus returns to the trigger, so a dialog opened by onSelect returns there too.
        close?.();
        onSelect();
    };

    return (
        <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            aria-disabled={disabled || undefined}
            onClick={handleClick}
            className={cx(
                'flex min-h-9 w-full items-start gap-2.5 rounded px-2.5 py-2 text-left text-sm pointer-coarse:min-h-11',
                'focus-visible:outline-offset-0',
                disabled ? 'cursor-not-allowed text-fg-subtle' : tone === 'danger' ? 'text-danger hover:bg-danger-soft' : 'text-fg hover:bg-hover',
            )}
        >
            {icon && <span className="mt-0.5 shrink-0 [&>svg]:size-4" aria-hidden="true">{icon}</span>}
            <span className="min-w-0">
                {children}
                {hint && <span className="mt-0.5 block text-xs text-fg-subtle">{hint}</span>}
            </span>
        </button>
    );
}

export function MenuSeparator() {
    return <div role="separator" className="my-1 h-px bg-line" />;
}
