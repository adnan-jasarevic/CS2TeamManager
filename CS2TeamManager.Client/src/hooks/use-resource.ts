import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { getApiErrorMessage } from '../services/errors';

export type ResourceLoader<T> = (signal: AbortSignal) => Promise<T>;

interface Settled<T> {
    load: ResourceLoader<T>;
    nonce: number;
    data?: T;
    error?: string;
}

export interface Resource<T> {
    data: T | undefined;
    /** Set when the latest request failed. Earlier data stays available next to it. */
    error: string | undefined;
    /** True on a first load with nothing to show yet: render a skeleton. */
    isLoading: boolean;
    /** True during any request, including a background refresh of data already on screen. */
    isFetching: boolean;
    reload: () => void;
}

/**
 * Loads data for a component and handles the parts every page otherwise gets wrong: a response
 * for a team or filter the user has already left is aborted and ignored, and the error and
 * loading states are derived rather than kept in sync by hand.
 *
 * `load` identifies the request, so wrap it in useCallback with what it depends on. A new function
 * means new data; pass null to wait (e.g. until an id is known).
 *
 * With `keepPrevious`, the old data stays on screen while a changed request loads. Use it for
 * filters and date ranges, where blanking the view on every change would flicker.
 */
export function useResource<T>(
    load: ResourceLoader<T> | null,
    errorMessage: string,
    { keepPrevious = false }: { keepPrevious?: boolean } = {},
): Resource<T> {
    const [settled, setSettled] = useState<Settled<T> | null>(null);
    const [nonce, setNonce] = useState(0);

    useEffect(() => {
        if (!load) return;
        const controller = new AbortController();
        load(controller.signal).then(
            data => setSettled({ load, nonce, data }),
            (err: unknown) => {
                if (axios.isCancel(err)) return;
                setSettled(previous => ({
                    load,
                    nonce,
                    data: previous && (previous.load === load || keepPrevious) ? previous.data : undefined,
                    error: getApiErrorMessage(err, errorMessage),
                }));
            },
        );
        return () => controller.abort();
    }, [load, nonce, errorMessage, keepPrevious]);

    const reload = useCallback(() => setNonce(n => n + 1), []);

    const isCurrent = settled !== null && settled.load === load && settled.nonce === nonce;
    const isFetching = load !== null && !isCurrent;
    const canShowData = load !== null && settled !== null && (settled.load === load || keepPrevious);
    const data = canShowData ? settled.data : undefined;

    return {
        data,
        error: isCurrent ? settled.error : undefined,
        isLoading: isFetching && data === undefined,
        isFetching,
        reload,
    };
}
