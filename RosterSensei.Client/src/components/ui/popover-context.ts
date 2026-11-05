import { createContext } from 'react';

/** Closes the nearest Popover and returns focus to its trigger. */
export const PopoverCloseContext = createContext<(() => void) | null>(null);
