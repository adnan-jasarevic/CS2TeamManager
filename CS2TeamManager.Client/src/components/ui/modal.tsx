import { useId, useLayoutEffect, useRef, useState, type FormEvent, type MouseEvent, type ReactNode, type RefObject, type SyntheticEvent } from 'react';
import { TriangleAlert, X } from 'lucide-react';
import { cx } from '../../lib/cx';
import { Alert } from './alert';
import { Button, IconButton } from './button';
import { Field, Input } from './field';

const SIZES = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' };

export interface ModalProps {
    open: boolean;
    /** Called for Esc, the close button and a backdrop click. The parent decides whether to close. */
    onClose: () => void;
    title: ReactNode;
    description?: ReactNode;
    /** Pinned below the scrolling body, so the actions stay reachable in a long form. */
    footer?: ReactNode;
    size?: keyof typeof SIZES;
    tone?: 'default' | 'danger';
    /** A request is running: every way of closing is blocked until it finishes. */
    busy?: boolean;
    /** Turn off for forms, where a stray click shouldn't throw away what was typed. */
    closeOnBackdrop?: boolean;
    /** Where focus goes on close, when the element that opened it may no longer exist. */
    returnFocusRef?: RefObject<HTMLElement | null>;
    children?: ReactNode;
}

/**
 * Built on the native <dialog>, so the focus trap, Esc, the inert background and the top layer
 * come from the browser instead of hand-written code. To focus a specific control when it opens,
 * give that control the `data-autofocus` attribute; otherwise the first focusable element is used.
 * Use `form` + `type="submit"` to connect a footer button to a form inside the body.
 */
export function Modal({
    open,
    onClose,
    title,
    description,
    footer,
    size = 'md',
    tone = 'default',
    busy = false,
    closeOnBackdrop = true,
    returnFocusRef,
    children,
}: ModalProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const pressedBackdrop = useRef(false);
    const titleId = useId();
    const descriptionId = useId();

    // A layout effect because its cleanup runs while the dialog is still in the document.
    useLayoutEffect(() => {
        const dialog = dialogRef.current;
        if (!open || !dialog) return;

        const returnTarget = returnFocusRef?.current ?? (document.activeElement as HTMLElement | null);
        if (!dialog.open) dialog.showModal();
        dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();

        return () => {
            dialog.close();
            // The opener can be gone, e.g. the row of a player who was just removed.
            if (returnTarget?.isConnected) returnTarget.focus();
            else document.getElementById('main')?.focus();
        };
    }, [open, returnFocusRef]);

    if (!open) return null;

    const requestClose = () => {
        if (!busy) onClose();
    };

    const handleCancel = (event: SyntheticEvent) => {
        event.preventDefault(); // Keeps React state in charge of whether the dialog is open.
        requestClose();
    };

    // Some browsers can force a close after repeated Esc. If that happens, bring state back in line.
    const handleNativeClose = () => {
        if (dialogRef.current && !dialogRef.current.open) onClose();
    };

    // The panel has no padding of its own, so a click whose target is the dialog hit the backdrop.
    // The press must start there too: selecting text and releasing outside shouldn't close it.
    const handleMouseDown = (event: MouseEvent) => {
        pressedBackdrop.current = event.target === dialogRef.current;
    };
    const handleClick = (event: MouseEvent) => {
        if (closeOnBackdrop && pressedBackdrop.current && event.target === dialogRef.current) requestClose();
    };

    return (
        <dialog
            ref={dialogRef}
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            aria-busy={busy || undefined}
            onCancel={handleCancel}
            onClose={handleNativeClose}
            onMouseDown={handleMouseDown}
            onClick={handleClick}
            className={cx(
                'rs-dialog m-auto w-full max-w-none flex-col overflow-hidden border border-line bg-raised text-fg shadow-overlay open:flex',
                // A bottom sheet on phones, within reach of a thumb; a centred panel from sm up.
                'max-h-[92dvh] max-sm:mb-0 max-sm:rounded-t-lg sm:w-[calc(100%-2rem)] sm:rounded-lg',
                SIZES[size],
                tone === 'danger' && 'border-t-2 border-t-accent',
            )}
        >
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line py-3 pr-3 pl-5">
                <div className="min-w-0 py-1.5">
                    <h2 id={titleId} className="flex items-center gap-2 text-lg font-bold break-words">
                        {tone === 'danger' && <TriangleAlert className="size-5 shrink-0 text-danger" aria-hidden="true" />}
                        {title}
                    </h2>
                    {description && <p id={descriptionId} className="mt-1 text-sm text-fg-muted">{description}</p>}
                </div>
                <IconButton label="Close" icon={<X className="size-5" aria-hidden="true" />} onClick={requestClose} disabled={busy} />
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">{children}</div>

            {footer && (
                <footer className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-line px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                    {footer}
                </footer>
            )}
        </dialog>
    );
}

export interface ConfirmDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: ReactNode;
    /** What will happen, and to whom. */
    children: ReactNode;
    confirmLabel: string;
    busyLabel?: string;
    busy?: boolean;
    /** Shown inside the dialog, so a failure can't be missed behind it. */
    error?: string;
    tone?: 'default' | 'danger';
    /** For the most serious actions: the user must type this word exactly before confirming. */
    confirmationText?: string;
}

/** Asks before an action that's hard to undo. Starts on Cancel, so a stray Enter is harmless. */
export function ConfirmDialog({ open, ...props }: ConfirmDialogProps) {
    // Mounted only while open, so the typed confirmation is always cleared for next time.
    return open ? <ConfirmDialogContent {...props} /> : null;
}

function ConfirmDialogContent({
    onClose,
    onConfirm,
    title,
    children,
    confirmLabel,
    busyLabel,
    busy = false,
    error,
    tone = 'danger',
    confirmationText,
}: Omit<ConfirmDialogProps, 'open'>) {
    const [typed, setTyped] = useState('');
    const formId = useId();
    const confirmed = !confirmationText || typed === confirmationText;

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        if (confirmed && !busy) onConfirm();
    };

    return (
        <Modal
            open
            onClose={onClose}
            title={title}
            tone={tone}
            size="sm"
            busy={busy}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose} disabled={busy} data-autofocus={confirmationText ? undefined : true}>
                        Cancel
                    </Button>
                    <Button type="submit" form={formId} variant={tone === 'danger' ? 'danger' : 'primary'} disabled={!confirmed} loading={busy} loadingText={busyLabel}>
                        {confirmLabel}
                    </Button>
                </>
            }
        >
            <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-4">
                {error && <Alert tone="danger">{error}</Alert>}
                <div className="text-sm text-fg-muted">{children}</div>
                {confirmationText && (
                    <Field label={`Type ${confirmationText} to continue`}>
                        <Input
                            value={typed}
                            onChange={e => setTyped(e.target.value)}
                            placeholder={confirmationText}
                            autoComplete="off"
                            data-autofocus
                        />
                    </Field>
                )}
            </form>
        </Modal>
    );
}
