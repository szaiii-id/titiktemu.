import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import StatusTabs from '../StatusTabs.svelte';
import type { StatusTab } from '@/types';

// ============================================================
// SETUP
// ============================================================

beforeEach(() => {
    vi.clearAllMocks();
});

const mockTabs: StatusTab[] = [
    { value: '', label: 'Semua', count: 20 },
    { value: 'pending', label: 'Pending', count: 5 },
    { value: 'completed', label: 'Selesai' },
];

// ============================================================
// KATEGORI 1 — RENDERING DASAR & STRUKTUR
// ============================================================

describe('StatusTabs.svelte — Rendering Dasar', () => {
    it('merender container tablist dengan role yang benar', () => {
        render(StatusTabs, { props: { tabs: mockTabs } });

        const tablist = screen.getByRole('tablist');
        expect(tablist).toBeInTheDocument();
        expect(tablist).toHaveClass('bg-gray-100');
    });

    it('merender semua tab sesuai data', () => {
        render(StatusTabs, { props: { tabs: mockTabs } });

        const tabs = screen.getAllByRole('tab');
        expect(tabs).toHaveLength(3);

        expect(
            screen.getByRole('tab', { name: /Semua/i }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('tab', { name: /Pending/i }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('tab', { name: /Selesai/i }),
        ).toBeInTheDocument();
    });

    it('merender counter jika count tersedia', () => {
        render(StatusTabs, { props: { tabs: mockTabs } });

        expect(
            screen.getByRole('tab', { name: /Semua/i }),
        ).toHaveTextContent('20');
        expect(
            screen.getByRole('tab', { name: /Pending/i }),
        ).toHaveTextContent('5');
    });

    it('TIDAK merender counter jika count tidak didefinisikan', () => {
        render(StatusTabs, { props: { tabs: mockTabs } });

        const selesaiTab = screen.getByRole('tab', { name: /Selesai/i });
        // Tab Selesai tidak punya <span> counter
        const spanCounter = selesaiTab.querySelector('span');
        expect(spanCounter).toBeNull();
    });
});

// ============================================================
// KATEGORI 2 — STATE AKTIF (VISUAL & ARIA)
// ============================================================

describe('StatusTabs.svelte — State Aktif', () => {
    it('menerapkan style aktif (bg-white) pada tab yang sesuai dengan prop active', () => {
        render(StatusTabs, {
            props: { tabs: mockTabs, active: 'pending' },
        });

        const activeTab = screen.getByRole('tab', { name: /Pending/i });
        expect(activeTab).toHaveClass('bg-white');
        expect(activeTab).toHaveClass('shadow-sm');

        const inactiveTab = screen.getByRole('tab', { name: /Semua/i });
        expect(inactiveTab).not.toHaveClass('bg-white');
    });

    it('menerapkan aria-selected="true" pada tab aktif', () => {
        render(StatusTabs, {
            props: { tabs: mockTabs, active: 'pending' },
        });

        expect(
            screen.getByRole('tab', { name: /Pending/i }),
        ).toHaveAttribute('aria-selected', 'true');
        expect(
            screen.getByRole('tab', { name: /Semua/i }),
        ).toHaveAttribute('aria-selected', 'false');
    });
});

// ============================================================
// KATEGORI 3 — INTERAKSI KLIK
// ------------------------------------------------------------
// Svelte 5: `component.$$` sudah dihapus. Verifikasi binding
// `active` lewat DOM (class & aria-selected) — lebih robust
// dan merupakan cara resmi Testing Library.
// ============================================================

describe('StatusTabs.svelte — Interaksi Klik', () => {
    it('memanggil onchange dengan value yang benar saat tab diklik', async () => {
        const onchange = vi.fn();
        render(StatusTabs, {
            props: { tabs: mockTabs, active: '', onchange },
        });

        const pendingTab = screen.getByRole('tab', { name: /Pending/i });
        await fireEvent.click(pendingTab);

        expect(onchange).toHaveBeenCalledWith('pending');
        expect(onchange).toHaveBeenCalledTimes(1);
    });

    it('memperbarui state visual setelah diklik (binding active)', async () => {
        render(StatusTabs, {
            props: { tabs: mockTabs, active: '' },
        });

        const pendingTab = screen.getByRole('tab', { name: /Pending/i });

        // Sebelum klik: tidak aktif
        expect(pendingTab).not.toHaveClass('bg-white');
        expect(pendingTab).toHaveAttribute('aria-selected', 'false');

        await fireEvent.click(pendingTab);

        // Setelah klik: aktif (binding active di-update → class & aria berubah)
        expect(pendingTab).toHaveClass('bg-white');
        expect(pendingTab).toHaveAttribute('aria-selected', 'true');
    });

    it('memindahkan state aktif saat tab berbeda diklik', async () => {
        render(StatusTabs, {
            props: { tabs: mockTabs, active: '' },
        });

        const pendingTab = screen.getByRole('tab', { name: /Pending/i });
        const selesaiTab = screen.getByRole('tab', { name: /Selesai/i });

        await fireEvent.click(pendingTab);
        expect(pendingTab).toHaveAttribute('aria-selected', 'true');

        await fireEvent.click(selesaiTab);
        expect(selesaiTab).toHaveAttribute('aria-selected', 'true');
        expect(pendingTab).toHaveAttribute('aria-selected', 'false');
    });
});