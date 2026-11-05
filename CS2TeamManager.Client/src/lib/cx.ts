/** Joins class names, skipping anything falsy: cx('a', isOn && 'b'). */
export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');
