import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ReportTabs from '../ReportTabs.svelte';

// ============================================================
// KATEGORI 1 — RENDERING DASAR
// ============================================================

describe('ReportTabs — Rendering Dasar', () => {
    it('merender 4 tab', () => {
        render(ReportTabs, { props: { active: 'pendapatan' } });

        const links = screen.getAllByRole('link');
        expect(links).toHaveLength(4);
    });

    it('merender label yang benar', () => {
        render(ReportTabs, { props: { active: 'pendapatan' } });

        expect(screen.getByText('Pendapatan')).toBeInTheDocument();
        expect(screen.getByText('Kinerja Mitra')).toBeInTheDocument();
        expect(screen.getByText('Rekap Harian')).toBeInTheDocument();
        expect(screen.getByText('Payout')).toBeInTheDocument();
    });

    it('merender href yang benar', () => {
        render(ReportTabs, { props: { active: 'pendapatan' } });

        const links = screen.getAllByRole('link');
        expect(links[0]).toHaveAttribute('href', '/admin/reports');
        expect(links[1]).toHaveAttribute('href', '/admin/reports/mitra');
        expect(links[2]).toHaveAttribute('href', '/admin/reports/daily');
        expect(links[3]).toHaveAttribute('href', '/admin/reports/payout');
    });
});

// ============================================================
// KATEGORI 2 — ACTIVE STATE
// ============================================================

describe('ReportTabs — Active State', () => {
    it('tab "pendapatan" aktif menerapkan bg-pink-dark text-white', () => {
        render(ReportTabs, { props: { active: 'pendapatan' } });

        const tab = screen.getByText('Pendapatan').closest('a');
        expect(tab?.className).toContain('bg-pink-dark');
        expect(tab?.className).toContain('text-white');
        expect(tab?.className).toContain('shadow-md');
    });

    it('tab "mitra" aktif menerapkan bg-pink-dark text-white', () => {
        render(ReportTabs, { props: { active: 'mitra' } });

        const tab = screen.getByText('Kinerja Mitra').closest('a');
        expect(tab?.className).toContain('bg-pink-dark');
        expect(tab?.className).toContain('text-white');
    });

    it('tab "daily" aktif menerapkan bg-pink-dark text-white', () => {
        render(ReportTabs, { props: { active: 'daily' } });

        const tab = screen.getByText('Rekap Harian').closest('a');
        expect(tab?.className).toContain('bg-pink-dark');
        expect(tab?.className).toContain('text-white');
    });

    it('tab "payout" aktif menerapkan bg-pink-dark text-white', () => {
        render(ReportTabs, { props: { active: 'payout' } });

        const tab = screen.getByText('Payout').closest('a');
        expect(tab?.className).toContain('bg-pink-dark');
        expect(tab?.className).toContain('text-white');
    });
});

// ============================================================
// KATEGORI 3 — INACTIVE STATE
// ============================================================

describe('ReportTabs — Inactive State', () => {
    it('tab yang tidak aktif menerapkan bg-white border text-dark', () => {
        render(ReportTabs, { props: { active: 'pendapatan' } });

        const mitraTab = screen.getByText('Kinerja Mitra').closest('a');
        expect(mitraTab?.className).toContain('bg-white');
        expect(mitraTab?.className).toContain('border');
        expect(mitraTab?.className).toContain('text-dark');
        expect(mitraTab?.className).not.toContain('bg-pink-dark');
    });

    it('semua tab (kecuali aktif) menerapkan style inactive', () => {
        render(ReportTabs, { props: { active: 'pendapatan' } });

        const inactiveLabels = ['Kinerja Mitra', 'Rekap Harian', 'Payout'];
        for (const label of inactiveLabels) {
            const tab = screen.getByText(label).closest('a');
            expect(tab?.className).toContain('bg-white');
            expect(tab?.className).not.toContain('bg-pink-dark');
        }
    });
});

// ============================================================
// KATEGORI 4 — EDGE CASES
// ============================================================

describe('ReportTabs — Edge Cases', () => {
    it('tidak ada tab yang aktif jika active tidak cocok', () => {
        render(ReportTabs, { props: { active: 'unknown' } });

        const links = screen.getAllByRole('link');
        for (const link of links) {
            expect(link.className).not.toContain('bg-pink-dark');
        }
    });

    it('tab container memiliki overflow-x-auto', () => {
        render(ReportTabs, { props: { active: 'pendapatan' } });

        const container = screen.getAllByRole('link')[0].closest('div');
        expect(container?.className).toContain('overflow-x-auto');
    });
});