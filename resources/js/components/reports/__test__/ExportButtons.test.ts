import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ExportButtons from '../ExportButtons.svelte';

// ============================================================
// KATEGORI 1 — RENDERING DASAR
// ============================================================

describe('ExportButtons — Rendering Dasar', () => {
    it('merender 2 link (PDF dan Excel)', () => {
        render(ExportButtons, {
            props: {
                pdfUrl: '/admin/reports/export-pdf',
                excelUrl: '/admin/reports/export-excel',
            },
        });

        const links = screen.getAllByRole('link');
        expect(links).toHaveLength(2);
    });

    it('merender label "PDF"', () => {
        render(ExportButtons, {
            props: {
                pdfUrl: '/admin/reports/export-pdf',
                excelUrl: '/admin/reports/export-excel',
            },
        });

        expect(screen.getByText('PDF')).toBeInTheDocument();
    });

    it('merender label "Excel"', () => {
        render(ExportButtons, {
            props: {
                pdfUrl: '/admin/reports/export-pdf',
                excelUrl: '/admin/reports/export-excel',
            },
        });

        expect(screen.getByText('Excel')).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 2 — HREF & TARGET
// ============================================================

describe('ExportButtons — Href & Target', () => {
    it('link PDF mengarah ke pdfUrl', () => {
        render(ExportButtons, {
            props: {
                pdfUrl: '/admin/reports/export-pdf?start_date=2026-01-01',
                excelUrl: '/admin/reports/export-excel',
            },
        });

        const pdfLink = screen.getByText('PDF').closest('a');
        expect(pdfLink).toHaveAttribute(
            'href',
            '/admin/reports/export-pdf?start_date=2026-01-01',
        );
    });

    it('link PDF memiliki target="_blank"', () => {
        render(ExportButtons, {
            props: {
                pdfUrl: '/admin/reports/export-pdf',
                excelUrl: '/admin/reports/export-excel',
            },
        });

        const pdfLink = screen.getByText('PDF').closest('a');
        expect(pdfLink).toHaveAttribute('target', '_blank');
    });

    it('link Excel mengarah ke excelUrl', () => {
        render(ExportButtons, {
            props: {
                pdfUrl: '/admin/reports/export-pdf',
                excelUrl: '/admin/reports/export-excel?start_date=2026-01-01',
            },
        });

        const excelLink = screen.getByText('Excel').closest('a');
        expect(excelLink).toHaveAttribute(
            'href',
            '/admin/reports/export-excel?start_date=2026-01-01',
        );
    });

    it('link Excel TIDAK memiliki target="_blank"', () => {
        render(ExportButtons, {
            props: {
                pdfUrl: '/admin/reports/export-pdf',
                excelUrl: '/admin/reports/export-excel',
            },
        });

        const excelLink = screen.getByText('Excel').closest('a');
        expect(excelLink).not.toHaveAttribute('target');
    });
});

// ============================================================
// KATEGORI 3 — STYLING
// ============================================================

describe('ExportButtons — Styling', () => {
    it('link PDF memiliki class bg-white border', () => {
        render(ExportButtons, {
            props: {
                pdfUrl: '/admin/reports/export-pdf',
                excelUrl: '/admin/reports/export-excel',
            },
        });

        const pdfLink = screen.getByText('PDF').closest('a');
        expect(pdfLink?.className).toContain('bg-white');
        expect(pdfLink?.className).toContain('border');
        expect(pdfLink?.className).toContain('text-dark');
    });

    it('link Excel memiliki class bg-green-700 text-white', () => {
        // ✅ FIX A11Y: `bg-green-600` diganti ke `bg-green-700` untuk
        // memenuhi WCAG AA contrast (3.21:1 → 6.1:1 terhadap text-white).
        // Test diupdate untuk match class yang baru.
        render(ExportButtons, {
            props: {
                pdfUrl: '/admin/reports/export-pdf',
                excelUrl: '/admin/reports/export-excel',
            },
        });

        const excelLink = screen.getByText('Excel').closest('a');
        expect(excelLink?.className).toContain('bg-green-700');
        expect(excelLink?.className).toContain('text-white');
    });

    it('kedua link memiliki class rounded-full', () => {
        render(ExportButtons, {
            props: {
                pdfUrl: '/admin/reports/export-pdf',
                excelUrl: '/admin/reports/export-excel',
            },
        });

        const links = screen.getAllByRole('link');
        for (const link of links) {
            expect(link.className).toContain('rounded-full');
        }
    });
});

// ============================================================
// KATEGORI 4 — IKON
// ============================================================

describe('ExportButtons — Ikon', () => {
    it('merender 2 ikon SVG', () => {
        render(ExportButtons, {
            props: {
                pdfUrl: '/admin/reports/export-pdf',
                excelUrl: '/admin/reports/export-excel',
            },
        });

        const svgs = document.querySelectorAll('svg');
        expect(svgs).toHaveLength(2);
    });

    it('ikon PDF memiliki class text-red-500', () => {
        render(ExportButtons, {
            props: {
                pdfUrl: '/admin/reports/export-pdf',
                excelUrl: '/admin/reports/export-excel',
            },
        });

        const pdfLink = screen.getByText('PDF').closest('a');
        const svg = pdfLink?.querySelector('svg');
        expect(svg?.classList.contains('text-red-500')).toBe(true);
    });

    it('ikon Excel TIDAK memiliki class text-red-500', () => {
        render(ExportButtons, {
            props: {
                pdfUrl: '/admin/reports/export-pdf',
                excelUrl: '/admin/reports/export-excel',
            },
        });

        const excelLink = screen.getByText('Excel').closest('a');
        const svg = excelLink?.querySelector('svg');
        expect(svg?.classList.contains('text-red-500')).toBe(false);
    });
});