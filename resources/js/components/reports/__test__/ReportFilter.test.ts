import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ReportFilter from '../ReportFilter.svelte';

beforeEach(() => {
    vi.clearAllMocks();
});

// ============================================================
// KATEGORI 1 — RENDERING DASAR
// ============================================================

describe('ReportFilter — Rendering Dasar', () => {
    it('merender label "Dari Tanggal"', () => {
        render(ReportFilter, {
            props: {
                startDate: '2026-01-01',
                endDate: '2026-01-31',
                onApply: vi.fn(),
            },
        });

        expect(screen.getByText('Dari Tanggal')).toBeInTheDocument();
    });

    it('merender label "Sampai Tanggal"', () => {
        render(ReportFilter, {
            props: {
                startDate: '2026-01-01',
                endDate: '2026-01-31',
                onApply: vi.fn(),
            },
        });

        expect(screen.getByText('Sampai Tanggal')).toBeInTheDocument();
    });

    it('merender tombol "Terapkan Filter"', () => {
        render(ReportFilter, {
            props: {
                startDate: '2026-01-01',
                endDate: '2026-01-31',
                onApply: vi.fn(),
            },
        });

        expect(
            screen.getByRole('button', { name: /Terapkan Filter/i }),
        ).toBeInTheDocument();
    });

    it('merender 2 input date', () => {
        render(ReportFilter, {
            props: {
                startDate: '2026-01-01',
                endDate: '2026-01-31',
                onApply: vi.fn(),
            },
        });

        const inputs = document.querySelectorAll('input[type="date"]');
        expect(inputs).toHaveLength(2);
    });
});

// ============================================================
// KATEGORI 2 — BINDING NILAI AWAL
// ============================================================

describe('ReportFilter — Binding Nilai Awal', () => {
    it('input pertama terisi startDate', () => {
        render(ReportFilter, {
            props: {
                startDate: '2026-01-01',
                endDate: '2026-01-31',
                onApply: vi.fn(),
            },
        });

        const inputs = document.querySelectorAll(
            'input[type="date"]',
        ) as NodeListOf<HTMLInputElement>;
        expect(inputs[0].value).toBe('2026-01-01');
    });

    it('input kedua terisi endDate', () => {
        render(ReportFilter, {
            props: {
                startDate: '2026-01-01',
                endDate: '2026-01-31',
                onApply: vi.fn(),
            },
        });

        const inputs = document.querySelectorAll(
            'input[type="date"]',
        ) as NodeListOf<HTMLInputElement>;
        expect(inputs[1].value).toBe('2026-01-31');
    });
});

// ============================================================
// KATEGORI 3 — INTERAKSI: PERUBAHAN INPUT
// ============================================================

describe('ReportFilter — Interaksi Input', () => {
    it('mengubah startDate memicu update', async () => {
        render(ReportFilter, {
            props: {
                startDate: '2026-01-01',
                endDate: '2026-01-31',
                onApply: vi.fn(),
            },
        });

        const inputs = document.querySelectorAll(
            'input[type="date"]',
        ) as NodeListOf<HTMLInputElement>;

        await fireEvent.input(inputs[0], {
            target: { value: '2026-02-01' },
        });

        // Svelte $bindable akan update value di DOM
        expect(inputs[0].value).toBe('2026-02-01');
    });

    it('mengubah endDate memicu update', async () => {
        render(ReportFilter, {
            props: {
                startDate: '2026-01-01',
                endDate: '2026-01-31',
                onApply: vi.fn(),
            },
        });

        const inputs = document.querySelectorAll(
            'input[type="date"]',
        ) as NodeListOf<HTMLInputElement>;

        await fireEvent.input(inputs[1], {
            target: { value: '2026-12-31' },
        });

        expect(inputs[1].value).toBe('2026-12-31');
    });
});

// ============================================================
// KATEGORI 4 — INTERAKSI: TOMBOL
// ============================================================

describe('ReportFilter — Tombol Apply', () => {
    it('mengklik tombol memanggil onApply', async () => {
        const onApply = vi.fn();

        render(ReportFilter, {
            props: {
                startDate: '2026-01-01',
                endDate: '2026-01-31',
                onApply,
            },
        });

        const button = screen.getByRole('button', {
            name: /Terapkan Filter/i,
        });
        await fireEvent.click(button);

        expect(onApply).toHaveBeenCalledTimes(1);
    });

    it('onApply dipanggil tepat 1x setiap klik', async () => {
        const onApply = vi.fn();

        render(ReportFilter, {
            props: {
                startDate: '2026-01-01',
                endDate: '2026-01-31',
                onApply,
            },
        });

        const button = screen.getByRole('button', {
            name: /Terapkan Filter/i,
        });

        await fireEvent.click(button);
        await fireEvent.click(button);

        expect(onApply).toHaveBeenCalledTimes(2);
    });
});

// ============================================================
// KATEGORI 5 — STYLING
// ============================================================

describe('ReportFilter — Styling', () => {
    it('container memiliki class bg-white rounded-3xl', () => {
        render(ReportFilter, {
            props: {
                startDate: '2026-01-01',
                endDate: '2026-01-31',
                onApply: vi.fn(),
            },
        });

        const container = document.querySelector('div.bg-white');
        expect(container?.className).toContain('rounded-3xl');
        expect(container?.className).toContain('border');
    });

    it('tombol memiliki class bg-dark text-white', () => {
        render(ReportFilter, {
            props: {
                startDate: '2026-01-01',
                endDate: '2026-01-31',
                onApply: vi.fn(),
            },
        });

        const button = screen.getByRole('button', {
            name: /Terapkan Filter/i,
        });
        expect(button.className).toContain('bg-dark');
        expect(button.className).toContain('text-white');
    });
});