import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import BackButton from '../BackButton.svelte';

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
// KATEGORI 1 — UI CONTRACT & RENDERING
// ============================================================

describe('BackButton.svelte — UI Contract', () => {
    it('merender link dengan label default "Kembali"', () => {
        render(BackButton, { props: { href: '/dashboard' } });

        const link = screen.getByRole('link', { name: /Kembali/i });
        expect(link).toBeInTheDocument();
        expect(link.textContent?.trim()).toBe('Kembali');
    });

    it('merender link dengan label kustom', () => {
        render(BackButton, {
            props: {
                href: '/admin/packages',
                label: 'Kembali ke Daftar Paket',
            },
        });

        const link = screen.getByRole('link', {
            name: /Kembali ke Daftar Paket/i,
        });
        expect(link).toBeInTheDocument();
    });

    it('atribut href terpasang dengan benar', () => {
        render(BackButton, { props: { href: '/admin/packages' } });

        const link = screen.getByRole('link');
        // ✅ Perbaikan: cocokkan dengan href yang dikirim (bukan '/admin/users')
        expect(link).toHaveAttribute('href', '/admin/packages');
    });

    it('merender ikon SVG panah ke kiri', () => {
        render(BackButton, { props: { href: '/dashboard' } });

        const link = screen.getByRole('link');
        const svg = link.querySelector('svg');

        expect(svg).toBeInTheDocument();
        expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    });

    it('posisi ikon berada sebelum teks label', () => {
        render(BackButton, {
            props: { href: '/dashboard', label: 'Kembali' },
        });

        const link = screen.getByRole('link');
        const children = Array.from(link.children);

        expect(children[0].tagName.toLowerCase()).toBe('svg');
        expect(link.textContent?.trim()).toBe('Kembali');
    });
});