import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import Pagination from '../Pagination.svelte';
import type { PaginationMeta } from '@/types';

// ============================================================
// MOCK INERTIA
// ============================================================
vi.mock('@inertiajs/svelte', () => ({
    inertia: () => ({
        update: vi.fn(),
        destroy: vi.fn(),
    }),
}));

// ============================================================
// SETUP
// ============================================================

beforeEach(() => {
    vi.clearAllMocks();
});

/**
 * Sesuai tipe `PaginationMeta` dari `@/types/pagination.ts`:
 *   current_page, last_page, from, to, total, links, per_page?
 *
 * Field seperti `data`, `first_page_url`, `last_page_url`,
 * `next_page_url`, `path`, `prev_page_url` TIDAK ADA di tipe
 * (dan tidak dipakai oleh komponen `Pagination.svelte`).
 */
const createMeta = (
    overrides: Partial<PaginationMeta> = {},
): PaginationMeta => ({
    current_page: 1,
    last_page: 2,
    from: 1,
    to: 10,
    total: 15,
    links: [
        { url: null, label: '&laquo; Previous', active: false },
        { url: '/items?page=1', label: '1', active: true },
        { url: '/items?page=2', label: '2', active: false },
        { url: '/items?page=2', label: 'Next &raquo;', active: false },
    ],
    per_page: 10,
    ...overrides,
});

/**
 * Helper: ambil container utama Pagination via <nav>.
 * `querySelector('.p-4.sm\\:p-6')` TIDAK BISA dipakai karena
 * `:` di class Tailwind diartikan sebagai pseudo-class.
 */
const getContainer = (): HTMLElement | null => {
    const nav = screen.queryByRole('navigation', { name: /Pagination/i });
    return (nav?.parentElement as HTMLElement) ?? null;
};

// ============================================================
// KATEGORI 1 — VISIBILITY
// ============================================================

describe('Pagination.svelte — Visibility', () => {
    it('TIDAK merender apa pun jika last_page = 1 dan showWhenEmpty = false', () => {
        render(Pagination, {
            props: { meta: createMeta({ last_page: 1 }) },
        });

        expect(
            screen.queryByRole('navigation', { name: /Pagination/i }),
        ).not.toBeInTheDocument();
    });

    it('merender pagination jika last_page > 1', () => {
        render(Pagination, {
            props: { meta: createMeta({ last_page: 2 }) },
        });

        expect(
            screen.getByRole('navigation', { name: /Pagination/i }),
        ).toBeInTheDocument();
    });

    it('merender pagination jika showWhenEmpty = true meskipun last_page = 1', () => {
        render(Pagination, {
            props: {
                meta: createMeta({ last_page: 1 }),
                showWhenEmpty: true,
            },
        });

        expect(
            screen.getByRole('navigation', { name: /Pagination/i }),
        ).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 2 — INFO TEKS
// ============================================================

describe('Pagination.svelte — Info Teks', () => {
    it('menampilkan info "Menampilkan X–Y dari Z item" (default label)', () => {
        render(Pagination, {
            props: {
                meta: createMeta({ from: 1, to: 10, total: 15 }),
            },
        });

        const container = getContainer()!;

        // Verifikasi teks gabungan (bukan per angka — angka "1" ambigu)
        expect(container.textContent).toMatch(
            /Menampilkan\s*1\s*–\s*10\s*dari\s*15\s*item/,
        );
    });

    it('menggunakan label kustom jika diberikan', () => {
        render(Pagination, {
            props: {
                meta: createMeta({ from: 1, to: 10, total: 15 }),
                label: 'booking',
            },
        });

        const container = getContainer()!;
        expect(container.textContent).toMatch(/booking/);
        expect(container.textContent).not.toMatch(/15\s*item/);
    });

    it('menampilkan angka 0 jika from/to null (data kosong)', () => {
        render(Pagination, {
            props: {
                meta: createMeta({ from: null, to: null, total: 0 }),
                showWhenEmpty: true,
            },
        });

        const container = getContainer()!;
        // "Menampilkan 0–0 dari 0 item"
        expect(container.textContent).toMatch(
            /Menampilkan\s*0\s*–\s*0\s*dari\s*0\s*item/,
        );
    });
});

// ============================================================
// KATEGORI 3 — RENDER LINK & LABEL
// ============================================================

describe('Pagination.svelte — Render Link & Label', () => {
    it('merender label link menggunakan HTML entity (&laquo; Previous)', () => {
        render(Pagination, {
            props: { meta: createMeta() },
        });

        expect(screen.getByText(/Previous/i)).toBeInTheDocument();
        expect(screen.getByText(/Next/i)).toBeInTheDocument();
    });

    it('merender link dengan href yang benar', () => {
        render(Pagination, {
            props: { meta: createMeta() },
        });

        const page2Link = screen.getByRole('link', { name: '2' });
        expect(page2Link).toHaveAttribute('href', '/items?page=2');
    });

    it('link aktif memiliki class bg-pink-dark dan aria-current="page"', () => {
        render(Pagination, {
            props: { meta: createMeta() },
        });

        const activeLink = screen.getByRole('link', { name: '1' });
        expect(activeLink).toHaveClass('bg-pink-dark');
        expect(activeLink).toHaveAttribute('aria-current', 'page');
    });

    it('link tidak aktif memiliki class text-gray-600', () => {
        render(Pagination, {
            props: { meta: createMeta() },
        });

        const inactiveLink = screen.getByRole('link', { name: '2' });
        expect(inactiveLink).toHaveClass('text-gray-600');
        expect(inactiveLink).not.toHaveAttribute('aria-current');
    });
});

// ============================================================
// KATEGORI 4 — LINK DISABLED (URL = NULL)
// ============================================================

describe('Pagination.svelte — Link Disabled', () => {
    it('merender <span> (bukan <a>) untuk link dengan url = null', () => {
        render(Pagination, {
            props: { meta: createMeta() },
        });

        const prevText = screen.getByText(/Previous/i);
        expect(prevText.tagName).toBe('SPAN');
        expect(prevText).toHaveAttribute('aria-disabled', 'true');
    });

    it('tidak merender href untuk link yang disabled', () => {
        render(Pagination, {
            props: { meta: createMeta() },
        });

        const prevText = screen.getByText(/Previous/i);
        expect(prevText).not.toHaveAttribute('href');
    });
});

// ============================================================
// KATEGORI 5 — A11Y & CUSTOM CLASS
// ============================================================

describe('Pagination.svelte — A11y & Custom Class', () => {
    it('container navigasi memiliki role dan aria-label', () => {
        render(Pagination, {
            props: { meta: createMeta() },
        });

        const nav = screen.getByRole('navigation', {
            name: /Pagination/i,
        });
        expect(nav).toBeInTheDocument();
    });

    it('menerapkan custom class ke container utama', () => {
        render(Pagination, {
            props: {
                meta: createMeta(),
                class: 'bg-gray-50 rounded-t-2xl',
            },
        });

        const container = getContainer()!;
        expect(container).toHaveClass('bg-gray-50');
        expect(container).toHaveClass('rounded-t-2xl');
    });
});