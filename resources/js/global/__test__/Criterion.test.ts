import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Criterion from '../Criterion.svelte';

// ============================================================
// KATEGORI 1 — RENDERING DASAR & LABEL
// ============================================================

describe('Criterion.svelte — Rendering Dasar', () => {
    it('merender label yang diberikan', () => {
        render(Criterion, { props: { label: 'Minimal 8 karakter' } });
        expect(screen.getByText('Minimal 8 karakter')).toBeInTheDocument();
    });

    it('merender teks tanpa ada elemen tambahan', () => {
        render(Criterion, { props: { label: 'Mengandung angka' } });
        
        // Pastikan container utama dirender
        const text = screen.getByText('Mengandung angka');
        expect(text.tagName).toBe('SPAN');
    });
});

// ============================================================
// KATEGORI 2 — STATE (PASSED / NOT PASSED)
// ============================================================

describe('Criterion.svelte — State Passed', () => {
    it('merender icon check (centang) dan warna hijau jika passed = true', () => {
        render(Criterion, { props: { label: 'Valid', passed: true } });
        
        // Cek warna teks hijau
        const text = screen.getByText('Valid');
        expect(text).toHaveClass('text-green-700');
        expect(text).toHaveClass('font-bold');

        // Cek icon lingkaran hijau
        const iconContainer = document.querySelector('.bg-green-100');
        expect(iconContainer).toBeInTheDocument();
        expect(iconContainer).toHaveClass('text-green-600');

        // Cek path SVG centang
        const path = iconContainer?.querySelector('path');
        expect(path).toHaveAttribute('d', 'M5 13l4 4L19 7');
    });

    it('merender icon silang (x) dan warna abu-abu jika passed = false', () => {
        render(Criterion, { props: { label: 'Belum valid', passed: false } });
        
        // Cek warna teks abu-abu
        const text = screen.getByText('Belum valid');
        expect(text).toHaveClass('text-gray-500');

        // Cek icon lingkaran abu-abu
        const iconContainer = document.querySelector('.bg-gray-100');
        expect(iconContainer).toBeInTheDocument();
        expect(iconContainer).toHaveClass('text-gray-400');

        // Cek path SVG silang
        const path = iconContainer?.querySelector('path');
        expect(path).toHaveAttribute('d', 'M6 18L18 6M6 6l12 12');
    });

    it('default passed = false jika prop passed tidak diberikan', () => {
        render(Criterion, { props: { label: 'Default' } });
        
        const text = screen.getByText('Default');
        expect(text).toHaveClass('text-gray-500');

        const iconContainer = document.querySelector('.bg-gray-100');
        expect(iconContainer).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 3 — STRUKTUR DOM & A11Y
// ============================================================

describe('Criterion.svelte — Struktur DOM', () => {
    it('memiliki struktur flex container dengan gap yang sesuai', () => {
        render(Criterion, { props: { label: 'Test', passed: true } });
        
        const container = document.querySelector('.flex.items-center.gap-1\\.5');
        expect(container).toBeInTheDocument();
        expect(container).toHaveClass('text-[11px]');
    });

    it('icon SVG berada di dalam lingkaran pembungkus', () => {
        render(Criterion, { props: { label: 'Test', passed: true } });
        
        const iconWrapper = document.querySelector('.rounded-full');
        const svg = iconWrapper?.querySelector('svg');
        
        expect(iconWrapper).toBeInTheDocument();
        expect(svg).toBeInTheDocument();
    });

    it('SVG tidak memiliki accessible name (dekoratif)', () => {
        render(Criterion, { props: { label: 'Test', passed: true } });
        
        // SVG tidak memiliki role atau aria-label eksplisit, yang berarti
        // ia dekoratif (teks label yang menjadi konteks).
        const svg = document.querySelector('svg');
        expect(svg).not.toHaveAttribute('aria-label');
        expect(svg).not.toHaveAttribute('role');
    });
});