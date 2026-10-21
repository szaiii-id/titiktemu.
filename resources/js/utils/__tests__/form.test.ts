import { describe, it, expect } from 'vitest';
import {
    parseRupiah,
    formatRupiahInput,
    parseIntInput,
    hasFormChanges,
    trimObject,
    isEmpty,
} from '../form';

// ============================================================
// KATEGORI 1 — parseRupiah
// ============================================================

describe('parseRupiah', () => {
    it('mengembalikan 0 untuk input kosong/null/undefined', () => {
        expect(parseRupiah(null)).toBe(0);
        expect(parseRupiah(undefined)).toBe(0);
        expect(parseRupiah('')).toBe(0);
    });

    it('mengembalikan number as-is jika input sudah number', () => {
        expect(parseRupiah(850000)).toBe(850000);
        expect(parseRupiah(NaN)).toBe(0);
    });

    it('parse format ribuan dengan titik', () => {
        expect(parseRupiah('850.000')).toBe(850000);
        expect(parseRupiah('1.500.000')).toBe(1500000);
    });

    it('parse format desimal dengan koma', () => {
        expect(parseRupiah('1,5')).toBe(1.5);
    });

    it('parse format ribuan + desimal', () => {
        expect(parseRupiah('1.500,5')).toBe(1500.5);
    });

    it('parse string tanpa pemisah', () => {
        expect(parseRupiah('850000')).toBe(850000);
    });

    it('parse format desimal Laravel ("850000.00")', () => {
        expect(parseRupiah('850000.00')).toBe(850000);
    });

    it('menghapus prefix "Rp" (case-insensitive)', () => {
        expect(parseRupiah('Rp 850.000')).toBe(850000);
        expect(parseRupiah('rp 1.500.000')).toBe(1500000);
    });

    it('mengasumsikan "1.500" sebagai ribuan (1500)', () => {
        expect(parseRupiah('1.500')).toBe(1500);
    });

    it('mengembalikan 0 untuk string non-numerik', () => {
        expect(parseRupiah('abc')).toBe(0);
    });
});

// ============================================================
// KATEGORI 2 — formatRupiahInput
// ============================================================

describe('formatRupiahInput', () => {
    it('mengembalikan string kosong untuk input tidak valid', () => {
        expect(formatRupiahInput(null)).toBe('');
        expect(formatRupiahInput(undefined)).toBe('');
        expect(formatRupiahInput(NaN)).toBe('');
    });

    it('format angka dengan pemisah ribuan', () => {
        expect(formatRupiahInput(850000)).toBe('850.000');
        expect(formatRupiahInput(1500000)).toBe('1.500.000');
    });

    it('tidak menampilkan desimal', () => {
        expect(formatRupiahInput(1500.5)).toBe('1.501'); // dibulatkan
    });
});

// ============================================================
// KATEGORI 3 — parseIntInput
// ============================================================

describe('parseIntInput', () => {
    it('mengembalikan 0 untuk input kosong/null/undefined', () => {
        expect(parseIntInput(null)).toBe(0);
        expect(parseIntInput(undefined)).toBe(0);
        expect(parseIntInput('')).toBe(0);
    });

    it('mengembalikan integer as-is untuk input number', () => {
        expect(parseIntInput(12)).toBe(12);
        expect(parseIntInput(12.9)).toBe(12); // truncate
        expect(parseIntInput(NaN)).toBe(0);
        expect(parseIntInput(Infinity)).toBe(0);
    });

    it('mengambil digit saja dari string', () => {
        expect(parseIntInput('12')).toBe(12);
        expect(parseIntInput('1.500')).toBe(1500);
        expect(parseIntInput('abc')).toBe(0);
        expect(parseIntInput('12 peserta')).toBe(12);
    });
});

// ============================================================
// KATEGORI 4 — hasFormChanges
// ============================================================

describe('hasFormChanges', () => {
    it('mengembalikan false untuk object identik', () => {
        expect(hasFormChanges({ name: 'A' }, { name: 'A' })).toBe(false);
    });

    it('mengembalikan true jika ada perbedaan nilai', () => {
        expect(hasFormChanges({ name: 'A' }, { name: 'B' })).toBe(true);
    });

    it('mengembalikan false jika string "5" dianggap sama dengan number 5', () => {
        expect(hasFormChanges({ jumlah: '5' }, { jumlah: 5 })).toBe(false);
    });

    it('mengembalikan false jika hanya beda spasi', () => {
        expect(hasFormChanges({ name: '  A  ' }, { name: 'A' })).toBe(false);
    });

    it('mengembalikan true jika ada key tambahan', () => {
        expect(hasFormChanges({ a: '1', b: '2' }, { a: '1' })).toBe(true);
    });

    it('menganggap null dan undefined sama dengan string kosong', () => {
        expect(hasFormChanges({ a: null }, { a: '' })).toBe(false);
        expect(hasFormChanges({ a: undefined }, { a: '' })).toBe(false);
    });
});

// ============================================================
// KATEGORI 5 — trimObject
// ============================================================

describe('trimObject', () => {
    it('memangkas semua string value', () => {
        expect(
            trimObject({ nama: '  Budi  ', email: ' a@b.c ' })
        ).toEqual({ nama: 'Budi', email: 'a@b.c' });
    });

    it('tidak mengubah non-string value', () => {
        expect(
            trimObject({ nama: '  Budi  ', umur: 30, aktif: true })
        ).toEqual({ nama: 'Budi', umur: 30, aktif: true });
    });

    it('tidak error untuk object kosong', () => {
        expect(trimObject({})).toEqual({});
    });
});

// ============================================================
// KATEGORI 6 — isEmpty
// ============================================================

describe('isEmpty', () => {
    it('mengembalikan true untuk null/undefined/string kosong/array kosong', () => {
        expect(isEmpty(null)).toBe(true);
        expect(isEmpty(undefined)).toBe(true);
        expect(isEmpty('')).toBe(true);
        expect(isEmpty('   ')).toBe(true);
        expect(isEmpty([])).toBe(true);
    });

    it('mengembalikan false untuk value yang terisi', () => {
        expect(isEmpty('hello')).toBe(false);
        expect(isEmpty(0)).toBe(false);
        expect(isEmpty(false)).toBe(false);
        expect(isEmpty([1, 2])).toBe(false);
    });

    it('mengembalikan false untuk object (meskipun kosong)', () => {
        expect(isEmpty({})).toBe(false);
    });
});