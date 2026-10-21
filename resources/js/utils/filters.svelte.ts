import type { FilterQuery } from '@/types';

import { router } from '@inertiajs/svelte';

// ==========================================
// TYPES
// ==========================================

export type FilterOptions<T extends Record<string, unknown>> = {
    url: string;
    initial: T;
    /**
     * Bangun query param dari state filter saat ini.
     *
     * Return type dibatasi ke `FilterQuery` supaya compatible
     * dengan `router.get()` di Inertia v2.
     */
    buildQuery: () => FilterQuery;
    debounceMs?: number;
};

export type FilterController<T extends Record<string, unknown>> = {
    values: T;
    update: (key: keyof T, value: unknown, immediate?: boolean) => void;
    updateSearch: (value: string) => void;
    clear: () => void;
    hasActive: () => boolean;
};

// ==========================================
// FACTORY
// ==========================================

export function createFilter<T extends Record<string, unknown>>(
    options: FilterOptions<T>,
): FilterController<T> {
    const debounceMs = options.debounceMs ?? 300;

    let values = $state<T>({ ...options.initial });

    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    function navigate(): void {
        router.get(options.url, options.buildQuery(), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    }

    function update(key: keyof T, value: unknown, immediate = false): void {
        (values as Record<string, unknown>)[key as string] = value;

        if (immediate) {
            clearTimeout(debounceTimer);
            navigate();
            return;
        }

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(navigate, debounceMs);
    }

    function updateSearch(value: string): void {
        (values as Record<string, unknown>)['search'] = value;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(navigate, debounceMs);
    }

    function clear(): void {
        clearTimeout(debounceTimer);
        values = { ...options.initial };

        for (const key of Object.keys(values)) {
            (values as Record<string, unknown>)[key] = '';
        }

        router.get(options.url, {}, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    }

    function hasActive(): boolean {
        for (const key of Object.keys(options.initial)) {
            const current = (values as Record<string, unknown>)[key];
            const initial = (options.initial as Record<string, unknown>)[key];

            if (normalize(current) !== normalize(initial)) {
                return true;
            }
        }

        return false;
    }

    return {
        get values() {
            return values;
        },
        update,
        updateSearch,
        clear,
        hasActive,
    };
}

// ==========================================
// INTERNAL
// ==========================================

function normalize(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value).trim().toLowerCase();
}