import { describe, it, expect } from 'vitest';
import {
    formatDate,
    formatDateTime,
    formatDateTimeTz,
    formatTime,
} from '../formatDate';

// ============================================================
// KATEGORI 1 — formatDate (tanggal murni)
// ============================================================

describe('formatDate', () => {
    it('mengembalikan "—" untuk input null/undefined/empty', () => {
        expect(formatDate(null)).toBe('—');
        expect(formatDate(undefined)).toBe('—');
        expect(formatDate('')).toBe('—');
    });

    it('mengembalikan "—" untuk input invalid', () => {
        expect(formatDate('bukan tanggal')).toBe('—');
    });

    it('memformat string DATE "YYYY-MM-DD" tanpa pergeseran timezone', () => {
        expect(formatDate('2026-10-16')).toBe('16 Okt 2026');
        expect(formatDate('2026-01-01')).toBe('1 Jan 2026');
    });

    it('memformat Date object', () => {
        const date = new Date(Date.UTC(2026, 9, 16, 12, 0, 0)); // 16 Okt 2026
        // Format tergantung locale, tapi harus mengandung "Okt 2026"
        expect(formatDate(date)).toContain('2026');
    });
});

// ============================================================
// KATEGORI 2 — formatDateTime (tanggal + waktu)
// ============================================================

describe('formatDateTime', () => {
    it('mengembalikan "—" untuk input invalid', () => {
        expect(formatDateTime(null)).toBe('—');
        expect(formatDateTime(undefined)).toBe('—');
        expect(formatDateTime('')).toBe('—');
        expect(formatDateTime('bukan tanggal')).toBe('—');
    });

    it('memformat timestamp UTC dalam timezone default (browser)', () => {
        // Tanpa timezone, hasil bergantung pada environment
        // Tapi harus mengandung pola tanggal
        const result = formatDateTime('2026-10-16T07:00:00Z');
        expect(result).not.toBe('—');
        expect(result).toContain('2026');
    });

    it('memformat timestamp UTC dalam timezone Asia/Makassar', () => {
        // 07:00 UTC = 15:00 WITA
        const result = formatDateTime('2026-10-16T07:00:00Z', 'Asia/Makassar');
        expect(result).toContain('16 Okt 2026');
        expect(result).toContain('15:00');
    });

    it('memformat timestamp UTC dalam timezone Asia/Jakarta', () => {
        // 07:00 UTC = 14:00 WIB
        const result = formatDateTime('2026-10-16T07:00:00Z', 'Asia/Jakarta');
        expect(result).toContain('14:00');
    });
});

// ============================================================
// KATEGORI 3 — formatDateTimeTz (dengan label timezone)
// ============================================================

describe('formatDateTimeTz', () => {
    it('mengembalikan "—" untuk input invalid', () => {
        expect(formatDateTimeTz(null)).toBe('—');
        expect(formatDateTimeTz('bukan tanggal')).toBe('—');
    });

    it('menambahkan label WITA untuk Asia/Makassar', () => {
        const result = formatDateTimeTz('2026-10-16T07:00:00Z', 'Asia/Makassar');
        expect(result).toContain('WITA');
        expect(result).toContain('15:00');
    });

    it('menambahkan label WIB untuk Asia/Jakarta', () => {
        const result = formatDateTimeTz('2026-10-16T07:00:00Z', 'Asia/Jakarta');
        expect(result).toContain('WIB');
    });

    it('menambahkan label WIT untuk Asia/Jayapura', () => {
        // 07:00 UTC = 16:00 WIT
        const result = formatDateTimeTz('2026-10-16T07:00:00Z', 'Asia/Jayapura');
        expect(result).toContain('WIT');
        expect(result).toContain('16:00');
    });

    it('TIDAK menambahkan label timezone jika timezone tidak dikenal', () => {
        const result = formatDateTimeTz('2026-10-16T07:00:00Z', 'Europe/London');
        expect(result).not.toContain('WIB');
        expect(result).not.toContain('WITA');
        expect(result).not.toContain('WIT');
    });
});

// ============================================================
// KATEGORI 4 — formatTime (jam saja)
// ============================================================

describe('formatTime', () => {
    it('mengembalikan "—" untuk input kosong/invalid', () => {
        expect(formatTime(null)).toBe('—');
        expect(formatTime(undefined)).toBe('—');
        expect(formatTime('')).toBe('—');
        expect(formatTime('bukan jam')).toBe('—');
    });

    it('mengembalikan string "HH:mm" dari input TIME database', () => {
        expect(formatTime('08:00')).toBe('08:00');
        expect(formatTime('17:30')).toBe('17:30');
        expect(formatTime('08:00:00')).toBe('08:00');
    });

    it('memformat timestamp UTC ke jam dalam timezone tertentu', () => {
        // 07:00 UTC = 15:00 WITA
        expect(formatTime('2026-10-16T07:00:00Z', 'Asia/Makassar')).toBe('15:00');
        // 07:00 UTC = 14:00 WIB
        expect(formatTime('2026-10-16T07:00:00Z', 'Asia/Jakarta')).toBe('14:00');
    });
});