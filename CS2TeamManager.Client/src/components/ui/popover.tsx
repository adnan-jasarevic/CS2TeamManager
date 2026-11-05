import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type FocusEvent, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../../lib/cx';
import { PopoverCloseContext } from './popover-context';

const VIEWPORT_MARGIN = 8;
const TRIGGER_GAP = 6;

export interface PopoverTriggerProps {
    ref: RefObject<HTMLButtonElement | null>;
    onClick: () => void;
    'aria-expanded': boolean;
    'aria-haspopup': 'menu' | 'dialog';
    'aria-controls': string | undefined;
}

export interface PopoverProps {
    /** Render the trigger and spread these props onto it. */
    renderTrigger: (props: PopoverTriggerProps) => ReactNode;
    /** Names the panel for screen readers. */
    label: string;
    role?: 'menu' | 'dialog';
    align?: 'start' | 'end';
    className?: string;
    onPanelKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
    children: ReactNode;
}

/**
 * A floating panel anchored to a button. It renders into <body> with fixed positioning, so an
 * `overflow: hidden` card or table can't clip it, and flips above the trigger when there's no
 * room below. Closes on Esc, an outside click, scrolling and focus leaving.
 */
export function Popover({ renderTrigger, label, role = 'dialog', align = 'end', className, onPanelKeyDown, children }: PopoverProps) {
    const [open, setOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const panelId = useId();

    const close = useCallback((returnFocus = true) => {
        setOpen(false);
        if (returnFocus) triggerRef.current?.focus();
    }, []);

    useLayoutEffect(() => {
        const trigger = triggerRef.current;
        const panel = panelRef.current;
        if (!open || !trigger || !panel) return;

        const anchor = trigger.getBoundingClientRect();
        const { width, height } = panel.getBoundingClientRect();
        const preferredLeft = align === 'end' ? anchor.right - width : anchor.left;
        const left = Math.min(Math.max(VIEWPORT_MARGIN, preferredLeft), window.innerWidth - width - VIEWPORT_MARGIN);
        const fitsBelow = anchor.bottom + TRIGGER_GAP + height <= window.innerHeight - VIEWPORT_MARGIN;
        const top = fitsBelow || anchor.top < height ? anchor.bottom + TRIGGER_GAP : anchor.top - height - TRIGGER_GAP;

        panel.style.left = `${left}px`;
        panel.style.top = `${Math.max(VIEWPORT_MARGIN, top)}px`;
        panel.querySelector<HTMLElement>('[role="menuitem"], input, button')?.focus();
    }, [open, align]);

    useEffect(() => {
        if (!open) return;

        const onPointerDown = (event: PointerEvent) => {
            const target = event.target as Node;
            if (!panelRef.current?.contains(target) && !triggerRef.current?.contains(target)) close(false);
        };
        const onKeyDown = (event: globalThis.KeyboardEvent) => {
            if (event.key === 'Escape') close();
        };
        // The panel is fixed, so it would drift away from its trigger if the page moved under it.
        const onScroll = (event: Event) => {
            if (!panelRef.current?.contains(event.target as Node)) close(false);
        };
        const onResize = () => close(false);

        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        window.addEventListener('scroll', onScroll, true);
        window.addEventListener('resize', onResize);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('scroll', onScroll, true);
            window.removeEventListener('resize', onResize);
        };
    }, [open, close]);

    const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
        const next = event.relatedTarget as Node | null;
        if (next && !panelRef.current?.contains(next) && !triggerRef.current?.contains(next)) close(false);
    };

    return (
        <>
            {renderTrigger({
                ref: triggerRef,
                onClick: () => setOpen(current => !current),
                'aria-expanded': open,
                'aria-haspopup': role,
                'aria-controls': open ? panelId : undefined,
            })}
            {open && createPortal(
                <div
                    ref={panelRef}
                    id={panelId}
                    role={role}
                    aria-label={label}
                    onBlur={handleBlur}
                    onKeyDown={onPanelKeyDown}
                    className={cx(
                        'fixed top-0 left-0 z-40 max-h-[70dvh] overflow-y-auto rounded-md border border-line bg-raised p-1 text-fg shadow-overlay',
                        className,
                    )}
                >
                    <PopoverCloseContext.Provider value={close}>{children}</PopoverCloseContext.Provider>
                </div>,
                document.body,
            )}
        </>
    );
}
