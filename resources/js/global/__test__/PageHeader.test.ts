import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import PageHeaderFixture from './__fixtures__/PageHeaderFixture.svelte';

// ============================================================
// SETUP & TEARDOWN
// ============================================================

beforeEach(() => {
    vi.clearAllMocks();
});

// ============================================================
// KATEGORI 1 — RENDERING DASAR (TITLE & DESCRIPTION)
// ============================================================

describe('PageHeader.svelte — Rendering Dasar', () => {
    it('merender title sebagai elemen h1', () => {
        render(PageHeaderFixture, {
            props: { title: 'Manajemen Paket' },
        });

        const heading = screen.getByRole('heading', {
            level: 1,
            name: 'Manajemen Paket',
        });
        expect(heading).toBeInTheDocument();
        expect(heading.tagName).toBe('H1');
    });

    it('merender description sebagai elemen paragraf jika diberikan', () => {
        render(PageHeaderFixture, {
            props: {
                title: 'Judul',
                description: 'Deskripsi halaman ini',
            },
        });

        const desc = screen.getByText('Deskripsi halaman ini');
        expect(desc).toBeInTheDocument();
        expect(desc.tagName).toBe('P');
    });

    it('TIDAK merender description jika kosong', () => {
        render(PageHeaderFixture, {
            props: { title: 'Judul', description: '' },
        });

        expect(document.querySelector('p')).toBeNull();
    });
});

// ============================================================
// KATEGORI 2 — ACTION SNIPPET
// ------------------------------------------------------------
// Svelte 5: `actions` adalah Snippet, bukan fungsi JS yang
// return HTMLElement. Gunakan wrapper fixture yang mendeklarasikan
// {#snippet actions()} di dalam template .svelte.
// ============================================================

describe('PageHeader.svelte — Action Snippet', () => {
    it('merender konten snippet actions jika diberikan', () => {
        render(PageHeaderFixture, {
            props: { title: 'Judul', withSnippet: true },
        });

        expect(
            screen.getByRole('button', { name: 'Tambah Data' }),
        ).toBeInTheDocument();
    });

    it('TIDAK merender container action jika snippet actions tidak diberikan', () => {
        render(PageHeaderFixture, {
            props: { title: 'Judul', withSnippet: false },
        });

        const actionContainer = document.querySelector('.flex-shrink-0');
        expect(actionContainer).toBeNull();
    });
});

// ============================================================
// KATEGORI 3 — STRUKTUR DOM & STYLING
// ============================================================

describe('PageHeader.svelte — Struktur DOM', () => {
    it('merender container utama dengan class flex dan margin-bottom', () => {
        render(PageHeaderFixture, { props: { title: 'Judul' } });

        // CATATAN: selector `.flex.flex-col.sm\\:flex-row` TIDAK BISA
        // dipakai karena `:` di class Tailwind dianggap pseudo-class CSS.
        // Gunakan pencarian via <h1> lalu ambil parent.
        const heading = screen.getByRole('heading', { level: 1 });
        const container = heading.closest('div')?.parentElement;

        expect(container).toBeInTheDocument();
        expect(container).toHaveClass('flex');
        expect(container).toHaveClass('flex-col');
        expect(container).toHaveClass('mb-6');
    });

    it('merender title dengan styling yang benar (text-2xl)', () => {
        render(PageHeaderFixture, { props: { title: 'Judul' } });

        const heading = screen.getByRole('heading', { level: 1 });
        expect(heading).toHaveClass('text-2xl');
        expect(heading).toHaveClass('font-extrabold');
        expect(heading).toHaveClass('text-dark');
    });
});