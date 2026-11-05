import { createContext, useContext, useId, useState, type ComponentPropsWithRef, type ReactNode } from 'react';
import { ChevronDown, Eye, EyeOff } from 'lucide-react';
import { cx } from '../../lib/cx';

interface FieldContextValue {
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
        <FieldContext.Provider value={{ controlId, describedBy: messageId, invalid: Boolean(error), required }}>
            <div className={cx('flex min-w-0 flex-col gap-1.5', className)}>
                <label htmlFor={controlId} className={cx('text-sm font-medium text-fg-muted', hideLabel && 'sr-only')}>
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
    'read-only:bg-transparent',
);

export function Input({ id, required, className, 'aria-describedby': describedBy, ...props }: ComponentPropsWithRef<'input'>) {
    const control = useFieldControl(id, required, describedBy);
    return <input {...props} {...control} className={cx(controlClasses, 'h-11 px-3', className)} />;
}

export function Textarea({ id, required, className, rows = 3, 'aria-describedby': describedBy, ...props }: ComponentPropsWithRef<'textarea'>) {
    const control = useFieldControl(id, required, describedBy);
    return <textarea {...props} {...control} rows={rows} className={cx(controlClasses, 'resize-y px-3 py-2.5', className)} />;
}

export function Select({ id, required, className, children, 'aria-describedby': describedBy, ...props }: ComponentPropsWithRef<'select'>) {
    const control = useFieldControl(id, required, describedBy);
    return (
        <span className="relative block min-w-0">
            <select {...props} {...control} className={cx(controlClasses, 'h-11 appearance-none truncate pr-9 pl-3', className)}>
                {children}
            </select>
            <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-fg-muted" />
        </span>
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
