import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFilter } from '../filters.svelte';

// ============================================================
// MOCK INERTIA
// ============================================================
const mockRouterGet = vi.fn();

vi.mock('@inertiajs/svelte', () => ({
    router: {
        get: (...args: any[]) => mockRouterGet(...args),
    },
}));

// ============================================================
// SETUP & TEARDOWN
// ============================================================

beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

// ============================================================
// KATEGORI 1 — INISIALISASI
// ============================================================

describe('createFilter — Inisialisasi', () => {
    it('menginisialisasi values dengan initial', () => {
        const filter = createFilter({
            url: '/test',
            initial: { search: '', status: '' },
            buildQuery: () => ({}),
        });

        expect(filter.values).toEqual({ search: '', status: '' });
    });

    it('hasActive mengembalikan false jika semua sama dengan initial', () => {
        const filter = createFilter({
            url: '/test',
            initial: { search: '', status: '' },
            buildQuery: () => ({}),
        });

        expect(filter.hasActive()).toBe(false);
    });
});

// ============================================================
// KATEGORI 2 — UPDATE (DEBOUNCED)
// ============================================================

describe('createFilter — update (debounced)', () => {
    it('meng-update values secara sinkron', () => {
        const filter = createFilter({
            url: '/test',
            initial: { search: '', status: '' },
            buildQuery: () => ({}),
        });

        filter.update('search', 'budi');
        expect(filter.values.search).toBe('budi');
    });

    it('tidak memanggil router.get sebelum debounce selesai', () => {
        const filter = createFilter({
            url: '/test',
            initial: { search: '', status: '' },
            buildQuery: () => ({ search: 'budi' }),
        });

        filter.update('search', 'budi');
        expect(mockRouterGet).not.toHaveBeenCalled();

        vi.advanceTimersByTime(300);
        expect(mockRouterGet).toHaveBeenCalledTimes(1);
    });

    it('hanya memanggil router.get sekali untuk multiple update dalam debounce window', () => {
        const filter = createFilter({
            url: '/test',
            initial: { search: '', status: '' },
            buildQuery: () => ({ search: 'budi' }),
        });

        filter.update('search', 'b');
        vi.advanceTimersByTime(100);
        filter.update('search', 'bu');
        vi.advanceTimersByTime(100);
        filter.update('search', 'bud');
        vi.advanceTimersByTime(300);

        expect(mockRouterGet).toHaveBeenCalledTimes(1);
    });

    it('menerima debounceMs kustom', () => {
        const filter = createFilter({
            url: '/test',
            initial: { search: '', status: '' },
            buildQuery: () => ({}),
            debounceMs: 500,
        });

        filter.update('search', 'budi');
        vi.advanceTimersByTime(300);
        expect(mockRouterGet).not.toHaveBeenCalled();

        vi.advanceTimersByTime(200);
        expect(mockRouterGet).toHaveBeenCalledTimes(1);
    });
});

// ============================================================
// KATEGORI 3 — UPDATE (IMMEDIATE)
// ============================================================

describe('createFilter — update (immediate)', () => {
    it('langsung memanggil router.get jika immediate = true', () => {
        const filter = createFilter({
            url: '/test',
            initial: { status: '' },
            buildQuery: () => ({ status: 'active' }),
        });

        filter.update('status', 'active', true);
        expect(mockRouterGet).toHaveBeenCalledTimes(1);
    });

    it('membatalkan debounce sebelumnya jika immediate = true', () => {
        const filter = createFilter({
            url: '/test',
            initial: { search: '', status: '' },
            buildQuery: () => ({ search: 'budi', status: 'active' }),
        });

        filter.update('search', 'budi');
        filter.update('status', 'active', true);

        // Harusnya hanya 1 call (dari immediate), bukan 2
        expect(mockRouterGet).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(300);
        expect(mockRouterGet).toHaveBeenCalledTimes(1);
    });
});

// ============================================================
// KATEGORI 4 — updateSearch
// ============================================================

describe('createFilter — updateSearch', () => {
    it('meng-update values.search dan memicu debounce', () => {
        const filter = createFilter({
            url: '/test',
            initial: { search: '', status: '' },
            buildQuery: () => ({ search: 'budi' }),
        });

        filter.updateSearch('budi');
        expect(filter.values.search).toBe('budi');

        vi.advanceTimersByTime(300);
        expect(mockRouterGet).toHaveBeenCalledTimes(1);
    });
});

// ============================================================
// KATEGORI 5 — CLEAR
// ============================================================

describe('createFilter — clear', () => {
    it('mengosongkan semua values dan memanggil router.get tanpa query', () => {
        const filter = createFilter({
            url: '/test',
            initial: { search: '', status: '' },
            buildQuery: () => ({}),
        });

        filter.update('search', 'budi');
        filter.update('status', 'active');
        filter.clear();

        expect(filter.values.search).toBe('');
        expect(filter.values.status).toBe('');

        // clear() memanggil router.get secara langsung (tanpa debounce)
        expect(mockRouterGet).toHaveBeenCalledWith(
            '/test',
            {},
            expect.objectContaining({ replace: true })
        );
    });

    it('membatalkan debounce yang sedang berjalan', () => {
        const filter = createFilter({
            url: '/test',
            initial: { search: '', status: '' },
            buildQuery: () => ({}),
        });

        filter.update('search', 'budi');
        filter.clear();

        vi.advanceTimersByTime(300);
        // Hanya clear() yang memanggil router.get, bukan update()
        expect(mockRouterGet).toHaveBeenCalledTimes(1);
    });
});

// ============================================================
// KATEGORI 6 — hasActive
// ============================================================

describe('createFilter — hasActive', () => {
    it('mengembalikan true jika ada perbedaan dengan initial', () => {
        const filter = createFilter({
            url: '/test',
            initial: { search: '', status: '' },
            buildQuery: () => ({}),
        });

        filter.update('search', 'budi');
        expect(filter.hasActive()).toBe(true);
    });

    it('mengembalikan false jika sama dengan initial (case-insensitive, trim)', () => {
        const filter = createFilter({
            url: '/test',
            initial: { search: 'Budi', status: '' },
            buildQuery: () => ({}),
        });

        filter.update('search', '  budi  '); // beda spasi & case
        expect(filter.hasActive()).toBe(false);
    });

    it('mengembalikan false jika di-clear', () => {
        const filter = createFilter({
            url: '/test',
            initial: { search: '', status: '' },
            buildQuery: () => ({}),
        });

        filter.update('search', 'budi');
        filter.clear();
        expect(filter.hasActive()).toBe(false);
    });

    it('menganggap null dan undefined sama dengan string kosong', () => {
        const filter = createFilter({
            url: '/test',
            initial: { search: null as unknown as string },
            buildQuery: () => ({}),
        });

        // Nilai current = null (initial), harusnya sama dengan initial
        expect(filter.hasActive()).toBe(false);
    });
});