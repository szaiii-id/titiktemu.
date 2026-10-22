import { describe, it, expect } from 'vitest';
import {
    formatDurasi,
    formatDurasiLong,
    hitungDurasiHari,
    hitungDurasiMalam,
    formatDurasiFromRange,
} from '../duration';

// ============================================================
// KATEGORI 1 — formatDurasi (RINGKAS)
// ============================================================

describe('formatDurasi', () => {
    it('mengembalikan "-" jika hari <= 0 atau bukan finite', () => {
        expect(formatDurasi(0, 0)).toBe('-');
        expect(formatDurasi(-1, 1)).toBe('-');
        expect(formatDurasi(NaN, 1)).toBe('-');
        expect(formatDurasi(Infinity, 1)).toBe('-');
    });

    it('mengembalikan "X Hari" jika malam <= 0', () => {
        expect(formatDurasi(1, 0)).toBe('1 Hari');
        expect(formatDurasi(2, 0)).toBe('2 Hari');
        expect(formatDurasi(2, -1)).toBe('2 Hari');
    });

    it('mengembalikan "XDXN" jika hari & malam valid', () => {
        expect(formatDurasi(2, 1)).toBe('2D1N');
        expect(formatDurasi(3, 2)).toBe('3D2N');
        expect(formatDurasi(5, 4)).toBe('5D4N');
    });
});

// ============================================================
// KATEGORI 2 — formatDurasiLong (PANJANG)
// ============================================================

describe('formatDurasiLong', () => {
    it('mengembalikan "-" jika hari <= 0 atau bukan finite', () => {
        expect(formatDurasiLong(0, 0)).toBe('-');
        expect(formatDurasiLong(-1, 1)).toBe('-');
        expect(formatDurasiLong(NaN, 1)).toBe('-');
    });

    it('mengembalikan "X Hari" jika malam <= 0', () => {
        expect(formatDurasiLong(1, 0)).toBe('1 Hari');
        expect(formatDurasiLong(2, 0)).toBe('2 Hari');
    });

    it('mengembalikan "X Hari Y Malam" jika keduanya valid', () => {
        expect(formatDurasiLong(2, 1)).toBe('2 Hari 1 Malam');
        expect(formatDurasiLong(3, 2)).toBe('3 Hari 2 Malam');
    });
});

// ============================================================
// KATEGORI 3 — hitungDurasiHari
// ============================================================

describe('hitungDurasiHari', () => {
    it('mengembalikan 0 jika mulai atau selesai null/undefined', () => {
        expect(hitungDurasiHari(null, null)).toBe(0);
        expect(hitungDurasiHari('2026-10-17', null)).toBe(0);
        expect(hitungDurasiHari(null, '2026-10-18')).toBe(0);
        expect(hitungDurasiHari(undefined, undefined)).toBe(0);
    });

    it('mengembalikan 0 jika format tanggal tidak valid', () => {
        expect(hitungDurasiHari('not-a-date', '2026-10-18')).toBe(0);
        expect(hitungDurasiHari('2026-10-17', 'invalid')).toBe(0);
        expect(hitungDurasiHari('', '')).toBe(0);
    });

    it('menghitung durasi inklusif dengan benar', () => {
        // 1 hari (tanggal sama)
        expect(hitungDurasiHari('2026-10-17', '2026-10-17')).toBe(1);
        
        // 2 hari (selisih 1 hari)
        expect(hitungDurasiHari('2026-10-17', '2026-10-18')).toBe(2);
        
        // 3 hari (selisih 2 hari)
        expect(hitungDurasiHari('2026-10-17', '2026-10-19')).toBe(3);
    });

    it('menghitung lintas bulan dan tahun dengan benar', () => {
        // Lintas bulan: 31 Okt - 2 Nov = 3 hari (31 Okt, 1 Nov, 2 Nov)
        expect(hitungDurasiHari('2026-10-31', '2026-11-02')).toBe(3);
        
        // Lintas tahun: 31 Des 2026 - 2 Jan 2027 = 3 hari
        expect(hitungDurasiHari('2026-12-31', '2027-01-02')).toBe(3);
        
        // Tahun kabisat: 28 Feb - 1 Mar 2028 (2028 kabisat) = 3 hari
        expect(hitungDurasiHari('2028-02-28', '2028-03-01')).toBe(3);
    });
});

// ============================================================
// KATEGORI 4 — hitungDurasiMalam
// ============================================================

describe('hitungDurasiMalam', () => {
    it('mengembalikan 0 jika mulai atau selesai null/undefined', () => {
        expect(hitungDurasiMalam(null, null)).toBe(0);
        expect(hitungDurasiMalam('2026-10-17', null)).toBe(0);
    });

    it('mengembalikan 0 untuk tanggal yang sama', () => {
        expect(hitungDurasiMalam('2026-10-17', '2026-10-17')).toBe(0);
    });

    it('menghitung durasi malam dengan benar', () => {
        expect(hitungDurasiMalam('2026-10-17', '2026-10-18')).toBe(1);
        expect(hitungDurasiMalam('2026-10-17', '2026-10-19')).toBe(2);
        expect(hitungDurasiMalam('2026-10-17', '2026-10-22')).toBe(5);
    });
});

// ============================================================
// KATEGORI 5 — formatDurasiFromRange
// ============================================================

describe('formatDurasiFromRange', () => {
    it('mengembalikan "-" jika range tidak valid', () => {
        expect(formatDurasiFromRange(null, null)).toBe('-');
        expect(formatDurasiFromRange('not-a-date', 'invalid')).toBe('-');
    });

    it('menghasilkan format ringkas yang benar', () => {
        expect(formatDurasiFromRange('2026-10-17', '2026-10-17')).toBe('1 Hari');
        expect(formatDurasiFromRange('2026-10-17', '2026-10-18')).toBe('2D1N');
        expect(formatDurasiFromRange('2026-10-17', '2026-10-19')).toBe('3D2N');
    });

    it('konsisten dengan kombinasi hitungDurasiHari & hitungDurasiMalam', () => {
        const mulai = '2026-10-17';
        const selesai = '2026-10-20';
        
        const hari = hitungDurasiHari(mulai, selesai);
        const malam = hitungDurasiMalam(mulai, selesai);
        
        expect(formatDurasiFromRange(mulai, selesai)).toBe(
            formatDurasi(hari, malam)
        );
    });
});