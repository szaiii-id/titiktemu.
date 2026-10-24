import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import StatCard from '../StatCard.svelte';

// ============================================================
// MOCK INERTIA
// ============================================================
// `use:inertia` butuh `inertia` dari Inertia. Kita mock
// agar tidak error dan tidak benar-benar navigasi.
vi.mock('@inertiajs/svelte', () => ({
    inertia: () => ({
        update: vi.fn(),
        destroy: vi.fn(),
    }),
}));

beforeEach(() => {
    vi.clearAllMocks();
});

// ============================================================
// KATEGORI 1 — RENDERING DASAR
// ============================================================

describe('StatCard — Rendering Dasar', () => {
    it('merender label', () => {
        render(StatCard, {
            props: { label: 'Total Booking', value: 42 },
        });

        expect(screen.getByText('Total Booking')).toBeInTheDocument();
    });

    it('merender value angka', () => {
        render(StatCard, {
            props: { label: 'Total Booking', value: 42 },
        });

        expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('merender value string', () => {
        render(StatCard, {
            props: { label: 'Status', value: 'Aktif' },
        });

        expect(screen.getByText('Aktif')).toBeInTheDocument();
    });

    it('merender value 0', () => {
        render(StatCard, {
            props: { label: 'Pending', value: 0 },
        });

        expect(screen.getByText('0')).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 2 — KONDISIONAL HREF
// ============================================================

describe('StatCard — Kondisional href', () => {
    it('merender <a> jika href diberikan', () => {
        render(StatCard, {
            props: {
                label: 'Booking',
                value: 10,
                href: '/admin/bookings',
            },
        });

        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', '/admin/bookings');
    });

    it('merender <div> jika href tidak diberikan', () => {
        render(StatCard, {
            props: { label: 'Booking', value: 10 },
        });

        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('merender <div> jika href = null', () => {
        render(StatCard, {
            props: { label: 'Booking', value: 10, href: null },
        });

        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('merender <a> dengan class hover jika href ada', () => {
        render(StatCard, {
            props: {
                label: 'Booking',
                value: 10,
                href: '/admin/bookings',
            },
        });

        const link = screen.getByRole('link');
        expect(link.className).toContain('hover:shadow-md');
        expect(link.className).toContain('hover:-translate-y-0.5');
    });

    it('merender <div> tanpa class hover jika href tidak ada', () => {
        render(StatCard, {
            props: { label: 'Booking', value: 10 },
        });

        const card = screen.getByText('Booking').closest('div.bg-white');
        expect(card?.className).not.toContain('hover:shadow-md');
    });
});

// ============================================================
// KATEGORI 3 — WARNA (COLOR VARIANTS)
// ============================================================

describe('StatCard — Warna', () => {
    it('default color = pink', () => {
        render(StatCard, {
            props: { label: 'Test', value: 1 },
        });

        const iconWrapper = screen.getByText('Test').closest('div')?.nextElementSibling;
        expect(iconWrapper?.className).toContain('bg-pink/10');
        expect(iconWrapper?.className).toContain('text-pink-text');
    });

    it('color = sun menerapkan bg-sun/10 text-sun-text', () => {
        render(StatCard, {
            props: { label: 'Test', value: 1, color: 'sun' },
        });

        const iconWrapper = screen.getByText('Test').closest('div')?.nextElementSibling;
        expect(iconWrapper?.className).toContain('bg-sun/10');
        expect(iconWrapper?.className).toContain('text-sun-text');
    });

    it('color = blue menerapkan bg-blue/10 text-blue-text', () => {
        render(StatCard, {
            props: { label: 'Test', value: 1, color: 'blue' },
        });

        const iconWrapper = screen.getByText('Test').closest('div')?.nextElementSibling;
        expect(iconWrapper?.className).toContain('bg-blue/10');
        expect(iconWrapper?.className).toContain('text-blue-text');
    });

    it('color = green menerapkan bg-green/10 text-green-text', () => {
        render(StatCard, {
            props: { label: 'Test', value: 1, color: 'green' },
        });

        const iconWrapper = screen.getByText('Test').closest('div')?.nextElementSibling;
        expect(iconWrapper?.className).toContain('bg-green/10');
        expect(iconWrapper?.className).toContain('text-green-text');
    });

    it('color = gray menerapkan bg-gray-100 text-gray-700', () => {
        render(StatCard, {
            props: { label: 'Test', value: 1, color: 'gray' },
        });

        const iconWrapper = screen.getByText('Test').closest('div')?.nextElementSibling;
        expect(iconWrapper?.className).toContain('bg-gray-100');
        expect(iconWrapper?.className).toContain('text-gray-700');
    });

    it('color = red menerapkan bg-red-50 text-red-700', () => {
        render(StatCard, {
            props: { label: 'Test', value: 1, color: 'red' },
        });

        const iconWrapper = screen.getByText('Test').closest('div')?.nextElementSibling;
        expect(iconWrapper?.className).toContain('bg-red-50');
        expect(iconWrapper?.className).toContain('text-red-700');
    });

    it('color = purple menerapkan bg-purple/10 text-purple-text', () => {
        render(StatCard, {
            props: { label: 'Test', value: 1, color: 'purple' },
        });

        const iconWrapper = screen.getByText('Test').closest('div')?.nextElementSibling;
        expect(iconWrapper?.className).toContain('bg-purple/10');
        expect(iconWrapper?.className).toContain('text-purple-text');
    });
});

// ============================================================
// KATEGORI 4 — IKON
// ============================================================

describe('StatCard — Ikon', () => {
    it('merender SVG ikon', () => {
        render(StatCard, {
            props: { label: 'Test', value: 1 },
        });

        const svg = document.querySelector('svg');
        expect(svg).toBeInTheDocument();
    });

    it('merender panah (arrow) jika href ada', () => {
        render(StatCard, {
            props: { label: 'Test', value: 1, href: '/test' },
        });

        const path = document.querySelector('svg path');
        expect(path?.getAttribute('d')).toContain('M14 5l7 7');
    });

    it('merender bar chart jika href tidak ada', () => {
        render(StatCard, {
            props: { label: 'Test', value: 1 },
        });

        const path = document.querySelector('svg path');
        expect(path?.getAttribute('d')).toContain('M9 19v-6');
    });
});