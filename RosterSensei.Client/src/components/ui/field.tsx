import { createContext, useContext, useId, useRef, useState, type ComponentPropsWithoutRef, type ComponentPropsWithRef, type KeyboardEvent, type ReactNode } from 'react';
import { Check, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { cx } from '../../lib/cx';
import { Popover } from './popover';
import { PopoverCloseContext } from './popover-context';

interface FieldContextValue {
    label: string;
    controlId: string;
    describedBy: string | undefined;
    invalid: boolean;
    required: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

export interface FieldProps {
    label: string;
    /** Help text under the control. Hidden while there's an error to show instead. */
    hint?: ReactNode;
    /** Marks the control invalid and announces the message with it. */
    error?: ReactNode;
    /** Adds a required marker to the label and passes `required` to the control. */
    required?: boolean;
    /** Appends "(optional)" to the label. */
    optional?: boolean;
    /** Keeps the label for screen readers only, when the context makes it obvious visually. */
    hideLabel?: boolean;
    className?: string;
    children: ReactNode;
}

/** Label, hint and error for one control, wired together for assistive tech automatically. */
export function Field({ label, hint, error, required = false, optional = false, hideLabel = false, className, children }: FieldProps) {
    const id = useId();
    const controlId = `${id}-control`;
    const message = error ?? hint;
    const messageId = message ? `${id}-message` : undefined;

    return (
        <FieldContext.Provider value={{ label, controlId, describedBy: messageId, invalid: Boolean(error), required }}>
            <div className={cx('flex min-w-0 flex-col gap-1.5', className)}>
                <label htmlFor={controlId} className={cx('text-sm font-medium break-words text-fg-muted', hideLabel && 'sr-only')}>
                    {label}
                    {required && <span aria-hidden="true" className="ml-0.5 text-accent-text">*</span>}
                    {optional && <span className="ml-1 font-normal text-fg-subtle">(optional)</span>}
                </label>
                {children}
                {message && (
                    <p id={messageId} className={cx('text-xs', error ? 'font-medium text-danger' : 'text-fg-subtle')}>
                        {message}
                    </p>
                )}
            </div>
        </FieldContext.Provider>
    );
}

function useFieldControl(id: string | undefined, required: boolean | undefined, describedBy: string | undefined) {
    const field = useContext(FieldContext);
    return {
        id: id ?? field?.controlId,
        required: required ?? field?.required,
        'aria-describedby': cx(describedBy, field?.describedBy) || undefined,
        'aria-invalid': field?.invalid || undefined,
    };
}

// 16px text on small screens stops iOS Safari zooming the page when a field takes focus.
const controlClasses = cx(
    'w-full rounded-md border border-line-strong bg-sunken text-base text-fg sm:text-sm',
    'placeholder:text-fg-subtle transition-colors duration-150 hover:border-fg-subtle',
    'focus:border-fg focus:ring-1 focus:ring-fg focus-visible:outline-none',
    'aria-invalid:border-danger',
    'disabled:cursor-not-allowed disabled:border-line disabled:text-fg-muted',
);

export function Input({ id, required, className, 'aria-describedby': describedBy, ...props }: ComponentPropsWithRef<'input'>) {
    const control = useFieldControl(id, required, describedBy);
    return <input {...props} {...control} className={cx(controlClasses, 'read-only:bg-transparent h-11 px-3', className)} />;
}

export function Textarea({ id, required, className, rows = 3, 'aria-describedby': describedBy, ...props }: ComponentPropsWithRef<'textarea'>) {
    const control = useFieldControl(id, required, describedBy);
    return <textarea {...props} {...control} rows={rows} className={cx(controlClasses, 'read-only:bg-transparent resize-y px-3 py-2.5', className)} />;
}

const TYPEAHEAD_RESET_MS = 500;

export interface SelectOption<T> {
    value: T;
    label: string;
    /** Smaller text under the label in the open list. The closed control only shows the label. */
    hint?: string;
}

export interface SelectProps<T extends string | number> extends Omit<ComponentPropsWithoutRef<'button'>, 'value' | 'onChange' | 'children' | 'type' | 'role'> {
    value: T;
    options: readonly SelectOption<T>[];
    onChange: (value: T) => void;
    required?: boolean;
    /** `sm` is for dense places like table filters. */
    size?: 'sm' | 'md';
}

/**
 * Pick one of a list of options, drawn with our own tokens because the popup of a native <select>
 * can't be themed reliably. Follows the ARIA combobox and listbox patterns: arrows, Home and End
 * move, typing jumps to a match, Enter or Space selects, Esc closes, Tab leaves.
 */
export function Select<T extends string | number>({ id, required, className, value, options, onChange, size = 'md', 'aria-describedby': describedBy, ...props }: SelectProps<T>) {
    const { required: isRequired, ...control } = useFieldControl(id, required, describedBy);
    const field = useContext(FieldContext);
    const typeahead = useRef({ text: '', time: 0 });
    const selected = options.find(option => option.value === value);

    const handleListKeyDown = (event: KeyboardEvent<HTMLDivElement>, close: () => void) => {
        // Focus returns to the trigger first, so the browser's Tab moves on from there, in page order.
        if (event.key === 'Tab') {
            close();
            return;
        }

        const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="option"]'));
        const current = items.indexOf(document.activeElement as HTMLElement);
        const targets: Record<string, number> = {
            ArrowDown: Math.min(current + 1, items.length - 1),
            ArrowUp: Math.max(current - 1, 0),
            Home: 0,
            End: items.length - 1,
        };
        if (event.key in targets) {
            event.preventDefault();
            typeahead.current = { text: '', time: 0 };
            items[targets[event.key]]?.focus();
            return;
        }

        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            const now = Date.now();
            const typing = now - typeahead.current.time < TYPEAHEAD_RESET_MS;
            // Space selects, unless it's part of a name being typed, like a native <select>.
            if (event.key === ' ' && !typing) return;
            event.preventDefault();
            const text = (typing ? typeahead.current.text : '') + event.key.toLowerCase();
            typeahead.current = { text, time: now };
            items.find(item => item.textContent?.trim().toLowerCase().startsWith(text))?.focus();
        }
    };

    return (
        <Popover
            label={field?.label ?? props['aria-label'] ?? 'Options'}
            role="listbox"
            align="start"
            matchTriggerWidth
            className="max-w-[min(24rem,calc(100vw-1rem))]"
            onPanelKeyDown={handleListKeyDown}
            renderTrigger={trigger => (
                <button
                    {...props}
                    {...control}
                    {...trigger}
                    type="button"
                    role="combobox"
                    title={selected?.label}
                    aria-required={isRequired || undefined}
                    onKeyDown={event => {
                        props.onKeyDown?.(event);
                        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                            event.preventDefault();
                            trigger.onClick();
                        }
                    }}
                    className={cx(
                        controlClasses,
                        'group flex cursor-pointer items-center justify-between gap-2 text-left aria-expanded:border-fg',
                        size === 'sm' ? 'h-8 px-2' : 'h-11 px-3',
                        className,
                    )}
                >
                    <span className="min-w-0 truncate">{selected?.label}</span>
                    <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-fg-muted transition-transform duration-150 group-aria-expanded:rotate-180" />
                </button>
            )}
        >
            {options.map((option, index) => (
                <SelectOptionButton
                    key={option.value}
                    label={option.label}
                    hint={option.hint}
                    selected={option.value === value}
                    initialFocus={selected ? option.value === value : index === 0}
                    onSelect={() => {
                        if (option.value !== value) onChange(option.value);
                    }}
                />
            ))}
        </Popover>
    );
}

function SelectOptionButton({ label, hint, selected, initialFocus, onSelect }: { label: string; hint?: string; selected: boolean; initialFocus: boolean; onSelect: () => void }) {
    const close = useContext(PopoverCloseContext);

    return (
        <button
            type="button"
            role="option"
            tabIndex={-1}
            aria-selected={selected}
            data-popover-focus={initialFocus || undefined}
            onClick={() => {
                close?.();
                onSelect();
            }}
            className={cx(
                'flex min-h-9 w-full cursor-pointer items-center justify-between gap-3 rounded px-2.5 py-2 text-left text-sm text-fg hover:bg-hover pointer-coarse:min-h-11',
                'focus-visible:outline-offset-0',
            )}
        >
            <span className="min-w-0 break-words">
                <span className={cx('block', selected && 'font-semibold')}>{label}</span>
                {hint && <span className="mt-0.5 block text-xs text-fg-subtle">{hint}</span>}
            </span>
            {selected && <Check aria-hidden="true" className="size-4 shrink-0 text-accent-text" />}
        </button>
    );
}

export function PasswordInput({ className, ...props }: Omit<ComponentPropsWithRef<'input'>, 'type'>) {
    const [visible, setVisible] = useState(false);
    return (
        <span className="relative block">
            <Input {...props} type={visible ? 'text' : 'password'} className={cx('pr-11', className)} />
            <button
                type="button"
                onClick={() => setVisible(v => !v)}
                aria-label={visible ? 'Hide password' : 'Show password'}
                aria-pressed={visible}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-fg-muted hover:text-fg"
            >
                {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
            </button>
        </span>
    );
}

export interface CheckboxProps extends Omit<ComponentPropsWithRef<'input'>, 'type'> {
    label: ReactNode;
}

export function Checkbox({ label, className, ...props }: CheckboxProps) {
    return (
        <label className={cx('flex min-h-9 cursor-pointer items-center gap-2.5 rounded-md px-2 text-sm text-fg-muted hover:bg-hover hover:text-fg pointer-coarse:min-h-11', className)}>
            <input type="checkbox" className="size-4 shrink-0 accent-(--rs-accent)" {...props} />
            {label}
        </label>
    );
}
