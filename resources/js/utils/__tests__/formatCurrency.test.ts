import { describe, it, expect } from 'vitest';
import {
    formatCurrency,
    formatNumber,
    parseCurrency,
} from '../formatCurrency';

// ============================================================
// KATEGORI 1 — formatCurrency
// ============================================================

describe('formatCurrency', () => {
    it('mengembalikan "—" untuk input null/undefined/empty', () => {
        expect(formatCurrency(null)).toBe('—');
        expect(formatCurrency(undefined)).toBe('—');
        expect(formatCurrency('')).toBe('—');
    });

    it('mengembalikan "—" untuk nilai tidak valid', () => {
        expect(formatCurrency('abc')).toBe('—');
        expect(formatCurrency(NaN)).toBe('—');
    });

    it('memformat angka dengan prefix "Rp" dan titik ribuan', () => {
        expect(formatCurrency(850000)).toBe('Rp 850.000');
        expect(formatCurrency(1500000)).toBe('Rp 1.500.000');
    });

    it('memformat angka 0', () => {
        expect(formatCurrency(0)).toBe('Rp 0');
    });

    it('memformat string angka ("1500000.00" dari Laravel)', () => {
        expect(formatCurrency('1500000.00')).toBe('Rp 1.500.000');
    });

    it('membulatkan desimal', () => {
        expect(formatCurrency(1500.4)).toBe('Rp 1.500');
        expect(formatCurrency(1500.5)).toBe('Rp 1.501');
    });
});

// ============================================================
// KATEGORI 2 — formatNumber
// ============================================================

describe('formatNumber', () => {
    it('mengembalikan "—" untuk input invalid', () => {
        expect(formatNumber(null)).toBe('—');
        expect(formatNumber(undefined)).toBe('—');
        expect(formatNumber('')).toBe('—');
        expect(formatNumber('abc')).toBe('—');
        expect(formatNumber(NaN)).toBe('—');
    });

    it('memformat angka tanpa prefix "Rp"', () => {
        expect(formatNumber(850000)).toBe('850.000');
        expect(formatNumber(1500000)).toBe('1.500.000');
    });

    it('memformat string angka', () => {
        expect(formatNumber('1500000.00')).toBe('1.500.000');
    });
});

// ============================================================
// KATEGORI 3 — parseCurrency
// ============================================================

describe('parseCurrency', () => {
    it('mengembalikan 0 untuk input kosong/null/undefined', () => {
        expect(parseCurrency(null)).toBe(0);
        expect(parseCurrency(undefined)).toBe(0);
        expect(parseCurrency('')).toBe(0);
    });

    it('mengembalikan number as-is untuk input number', () => {
        expect(parseCurrency(850000)).toBe(850000);
        expect(parseCurrency(NaN)).toBe(0);
    });

    it('parse format ribuan dengan titik', () => {
        expect(parseCurrency('850.000')).toBe(850000);
        expect(parseCurrency('1.500.000')).toBe(1500000);
    });

    it('parse format desimal dengan koma', () => {
        expect(parseCurrency('1,5')).toBe(1.5);
    });

    it('parse format ribuan + desimal', () => {
        expect(parseCurrency('1.500.000,50')).toBe(1500000.5);
    });

    it('parse string tanpa pemisah', () => {
        expect(parseCurrency('850000')).toBe(850000);
    });

    it('parse format desimal Laravel ("850000.00")', () => {
        expect(parseCurrency('850000.00')).toBe(850000);
    });

    it('menghapus prefix "Rp" (case-insensitive)', () => {
        expect(parseCurrency('Rp 850.000')).toBe(850000);
        expect(parseCurrency('rp 1.500.000')).toBe(1500000);
    });

    it('mengasumsikan "1.500" sebagai ribuan (1500)', () => {
        expect(parseCurrency('1.500')).toBe(1500);
    });

    it('mengembalikan 0 untuk string non-numerik', () => {
        expect(parseCurrency('abc')).toBe(0);
    });
});