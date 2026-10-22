import { describe, it, expect, vi, afterEach } from 'vitest';
import {
    timezoneLabel,
    timezoneLabelLong,
    timezoneOffset,
    todayInTimezone,
    isTodayInTimezone,
    isPastInTimezone,
    isFutureInTimezone,
    isDateInRange,
    DEFAULT_TIMEZONE,
} from '../timezone';

// ============================================================
// SETUP & TEARDOWN
// ============================================================

afterEach(() => {
    vi.useRealTimers();
});

// ============================================================
// KATEGORI 1 — timezoneLabel
// ============================================================

describe('timezoneLabel', () => {
    it('mengembalikan "-" untuk input null/undefined', () => {
        expect(timezoneLabel(null)).toBe('-');
        expect(timezoneLabel(undefined)).toBe('-');
        expect(timezoneLabel('')).toBe('-');
    });

    it('mengembalikan label singkat untuk timezone Indonesia', () => {
        expect(timezoneLabel('Asia/Jakarta')).toBe('WIB');
        expect(timezoneLabel('Asia/Makassar')).toBe('WITA');
        expect(timezoneLabel('Asia/Jayapura')).toBe('WIT');
    });

    it('mengembalikan string asli untuk timezone tidak dikenal', () => {
        expect(timezoneLabel('Europe/Paris')).toBe('Europe/Paris');
    });
});

// ============================================================
// KATEGORI 2 — timezoneLabelLong
// ============================================================

describe('timezoneLabelLong', () => {
    it('mengembalikan "-" untuk input null/undefined', () => {
        expect(timezoneLabelLong(null)).toBe('-');
        expect(timezoneLabelLong(undefined)).toBe('-');
    });

    it('mengembalikan label panjang dengan offset untuk timezone Indonesia', () => {
        const result = timezoneLabelLong('Asia/Makassar');
        expect(result).toContain('WITA');
        expect(result).toContain('+08:00');
    });

    it('mengembalikan string asli untuk timezone tidak dikenal', () => {
        expect(timezoneLabelLong('Europe/Paris')).toBe('Europe/Paris');
    });
});

// ============================================================
// KATEGORI 3 — timezoneOffset
// ============================================================

describe('timezoneOffset', () => {
    it('mengembalikan offset yang benar untuk WIB', () => {
        expect(timezoneOffset('Asia/Jakarta')).toBe('+07:00');
    });

    it('mengembalikan offset yang benar untuk WITA', () => {
        expect(timezoneOffset('Asia/Makassar')).toBe('+08:00');
    });

    it('mengembalikan offset yang benar untuk WIT', () => {
        expect(timezoneOffset('Asia/Jayapura')).toBe('+09:00');
    });

    it('mengembalikan "+00:00" untuk timezone tidak valid', () => {
        expect(timezoneOffset('Invalid/Zone')).toBe('+00:00');
    });
});

// ============================================================
// KATEGORI 4 — todayInTimezone (dengan mock Date)
// ============================================================

describe('todayInTimezone', () => {
    it('mengembalikan tanggal hari ini dalam format YYYY-MM-DD', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-10-17T10:00:00Z'));

        expect(todayInTimezone('Asia/Makassar')).toBe('2026-10-17');
    });

    it('menghasilkan tanggal berbeda di timezone berbeda (cross-day)', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-10-17T22:00:00Z'));

        expect(todayInTimezone('Asia/Makassar')).toBe('2026-10-18');
        expect(todayInTimezone('UTC')).toBe('2026-10-17');
    });

    it('default ke DEFAULT_TIMEZONE jika tidak diberi argumen', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-10-17T10:00:00Z'));

        expect(todayInTimezone()).toBe(todayInTimezone(DEFAULT_TIMEZONE));
    });
});

// ============================================================
// KATEGORI 5 — isTodayInTimezone
// ============================================================

describe('isTodayInTimezone', () => {
    it('mengembalikan false untuk input null/undefined/empty', () => {
        expect(isTodayInTimezone(null)).toBe(false);
        expect(isTodayInTimezone(undefined)).toBe(false);
        expect(isTodayInTimezone('')).toBe(false);
    });

    it('mengembalikan true jika tanggal cocok dengan hari ini', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-10-17T10:00:00Z'));

        expect(isTodayInTimezone('2026-10-17', 'Asia/Makassar')).toBe(true);
    });

    it('mengembalikan false jika tanggal berbeda', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-10-17T10:00:00Z'));

        expect(isTodayInTimezone('2026-10-16', 'Asia/Makassar')).toBe(false);
    });

    it('menerima ISO timestamp sebagai input', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-10-17T10:00:00Z'));

        expect(isTodayInTimezone('2026-10-17T00:00:00.000Z', 'Asia/Makassar')).toBe(true);
    });
});

// ============================================================
// KATEGORI 6 — isPastInTimezone & isFutureInTimezone
// ============================================================

describe('isPastInTimezone', () => {
    it('mengembalikan false untuk input kosong', () => {
        expect(isPastInTimezone(null)).toBe(false);
        expect(isPastInTimezone('')).toBe(false);
    });

    it('mengembalikan true untuk tanggal kemarin', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-10-17T10:00:00Z'));

        expect(isPastInTimezone('2026-10-16', 'Asia/Makassar')).toBe(true);
    });

    it('mengembalikan false untuk hari ini', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-10-17T10:00:00Z'));

        expect(isPastInTimezone('2026-10-17', 'Asia/Makassar')).toBe(false);
    });
});

describe('isFutureInTimezone', () => {
    it('mengembalikan false untuk input kosong', () => {
        expect(isFutureInTimezone(null)).toBe(false);
        expect(isFutureInTimezone('')).toBe(false);
    });

    it('mengembalikan true untuk tanggal besok', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-10-17T10:00:00Z'));

        expect(isFutureInTimezone('2026-10-18', 'Asia/Makassar')).toBe(true);
    });

    it('mengembalikan false untuk hari ini', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-10-17T10:00:00Z'));

        expect(isFutureInTimezone('2026-10-17', 'Asia/Makassar')).toBe(false);
    });
});

// ============================================================
// KATEGORI 7 — isDateInRange
// ============================================================

describe('isDateInRange', () => {
    it('mengembalikan false untuk input yang tidak lengkap', () => {
        expect(isDateInRange(null, '2026-10-17', '2026-10-20')).toBe(false);
        expect(isDateInRange('2026-10-18', null, '2026-10-20')).toBe(false);
        expect(isDateInRange('2026-10-18', '2026-10-17', null)).toBe(false);
    });

    it('mengembalikan true jika tanggal di dalam range', () => {
        expect(isDateInRange('2026-10-18', '2026-10-17', '2026-10-20')).toBe(true);
    });

    it('mengembalikan true jika tanggal = start (inklusif)', () => {
        expect(isDateInRange('2026-10-17', '2026-10-17', '2026-10-20')).toBe(true);
    });

    it('mengembalikan true jika tanggal = end (inklusif)', () => {
        expect(isDateInRange('2026-10-20', '2026-10-17', '2026-10-20')).toBe(true);
    });

    it('mengembalikan false jika tanggal di luar range', () => {
        expect(isDateInRange('2026-10-16', '2026-10-17', '2026-10-20')).toBe(false);
        expect(isDateInRange('2026-10-21', '2026-10-17', '2026-10-20')).toBe(false);
    });
});