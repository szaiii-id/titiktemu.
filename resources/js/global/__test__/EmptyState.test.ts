import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import EmptyStateFixture from './__fixtures__/EmptyStateFixture.svelte';

// ============================================================
// KATEGORI 1 — RENDERING DASAR (ICON, TITLE, DESCRIPTION)
// ============================================================

describe('EmptyState.svelte — Rendering Dasar', () => {
    it('merender title yang diberikan', () => {
        render(EmptyStateFixture, {
            props: { title: 'Belum ada data' },
        });
        expect(
            screen.getByRole('heading', { name: 'Belum ada data' }),
        ).toBeInTheDocument();
    });

    it('merender description jika diberikan', () => {
        render(EmptyStateFixture, {
            props: {
                title: 'Kosong',
                description: 'Silakan tambah data baru.',
            },
        });
        expect(
            screen.getByText('Silakan tambah data baru.'),
        ).toBeInTheDocument();
    });

    it('TIDAK merender description jika kosong', () => {
        render(EmptyStateFixture, {
            props: { title: 'Kosong', description: '' },
        });

        const p = document.querySelector('p');
        expect(p).not.toBeInTheDocument();
    });

    it('merender icon SVG default', () => {
        render(EmptyStateFixture, { props: { title: 'Kosong' } });

        const svg = document.querySelector('svg');
        expect(svg).toBeInTheDocument();

        const path = svg?.querySelector('path');
        expect(path).toHaveAttribute(
            'd',
            'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
        );
    });

    it('merender icon kustom jika diberikan', () => {
        const customIcon = 'M12 4v16m8-8H4';
        render(EmptyStateFixture, {
            props: { title: 'Kosong', icon: customIcon },
        });

        const path = document.querySelector('path');
        expect(path).toHaveAttribute('d', customIcon);
    });
});

// ============================================================
// KATEGORI 2 — ACTION: HAPUS FILTER (hasFilters + onClear)
// ============================================================

describe('EmptyState.svelte — Action: Hapus Filter', () => {
    it('merender tombol "Hapus Filter" jika hasFilters = true dan onClear diberikan', () => {
        render(EmptyStateFixture, {
            props: {
                title: 'Tidak ditemukan',
                hasFilters: true,
                onClear: vi.fn(),
            },
        });

        expect(
            screen.getByRole('button', { name: /Hapus Filter/i }),
        ).toBeInTheDocument();
    });

    it('memanggil onClear saat tombol "Hapus Filter" diklik', async () => {
        const onClear = vi.fn();
        render(EmptyStateFixture, {
            props: {
                title: 'Tidak ditemukan',
                hasFilters: true,
                onClear,
            },
        });

        await fireEvent.click(
            screen.getByRole('button', { name: /Hapus Filter/i }),
        );
        expect(onClear).toHaveBeenCalledTimes(1);
    });

    it('TIDAK merender tombol "Hapus Filter" jika hasFilters = true tapi onClear kosong', () => {
        render(EmptyStateFixture, {
            props: {
                title: 'Tidak ditemukan',
                hasFilters: true,
            },
        });

        expect(
            screen.queryByRole('button', { name: /Hapus Filter/i }),
        ).not.toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 3 — ACTION: CUSTOM ACTION (actionLabel + onAction)
// ============================================================

describe('EmptyState.svelte — Action: Custom Action', () => {
    it('merender tombol custom jika actionLabel dan onAction diberikan', () => {
        render(EmptyStateFixture, {
            props: {
                title: 'Belum ada paket',
                actionLabel: 'Tambah Paket',
                onAction: vi.fn(),
            },
        });

        expect(
            screen.getByRole('button', { name: /Tambah Paket/i }),
        ).toBeInTheDocument();
    });

    it('memanggil onAction saat tombol custom diklik', async () => {
        const onAction = vi.fn();
        render(EmptyStateFixture, {
            props: {
                title: 'Belum ada paket',
                actionLabel: 'Tambah Paket',
                onAction,
            },
        });

        await fireEvent.click(
            screen.getByRole('button', { name: /Tambah Paket/i }),
        );
        expect(onAction).toHaveBeenCalledTimes(1);
    });

    it('TIDAK merender tombol custom jika hanya actionLabel yang ada (tanpa onAction)', () => {
        render(EmptyStateFixture, {
            props: {
                title: 'Belum ada paket',
                actionLabel: 'Tambah Paket',
            },
        });

        expect(
            screen.queryByRole('button', { name: /Tambah Paket/i }),
        ).not.toBeInTheDocument();
    });

    it('prioritas "Hapus Filter" lebih tinggi daripada custom action jika keduanya tersedia', () => {
        render(EmptyStateFixture, {
            props: {
                title: 'Kosong',
                hasFilters: true,
                onClear: vi.fn(),
                actionLabel: 'Tambah Paket',
                onAction: vi.fn(),
            },
        });

        expect(
            screen.getByRole('button', { name: /Hapus Filter/i }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: /Tambah Paket/i }),
        ).not.toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 4 — ACTION: SNIPPET (children)
// ------------------------------------------------------------
// Svelte 5: `actions` adalah Snippet, bukan fungsi yang return
// HTMLElement. Gunakan wrapper fixture yang mendeklarasikan
// {#snippet actions()} di dalam template .svelte.
// ============================================================

describe('EmptyState.svelte — Action: Snippet', () => {
    it('merender konten dari snippet actions jika diberikan', () => {
        render(EmptyStateFixture, {
            props: {
                title: 'Kosong',
                withSnippet: true,
            },
        });

        expect(
            screen.getByRole('button', {
                name: /Custom Button dari Snippet/i,
            }),
        ).toBeInTheDocument();
    });

    it('prioritas tombol Hapus Filter / Custom Action lebih tinggi daripada snippet', () => {
        render(EmptyStateFixture, {
            props: {
                title: 'Kosong',
                actionLabel: 'Aksi Utama',
                onAction: vi.fn(),
                withSnippet: true,
            },
        });

        // Harus merender "Aksi Utama", BUKAN "Custom Button dari Snippet"
        expect(
            screen.getByRole('button', { name: /Aksi Utama/i }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', {
                name: /Custom Button dari Snippet/i,
            }),
        ).not.toBeInTheDocument();
    });
});