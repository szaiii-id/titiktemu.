/**
 * Helper timezone — konsisten dengan PRD v2.0 §9.6.
 *
 * Prinsip:
 * - Semua timestamp dari backend adalah UTC (ISO 8601).
 * - Tanggal murni (DATE) dari backend adalah netral timezone ('YYYY-MM-DD').
 * - "Hari ini" HARUS dihitung di timezone yang eksplisit (trip.timezone /
 *   package.timezone / viewer_timezone), BUKAN browser timezone.
 */

import { formatDate } from './formatDate';

// ==========================================
// TYPES
// ==========================================

export type TimezoneOption = {
    value: string;
    label: string;
};

// ==========================================
// CONSTANTS
// ==========================================

const TZ_LABELS: Record<string, string> = {
    'Asia/Jakarta': 'WIB',
    'Asia/Makassar': 'WITA',
    'Asia/Jayapura': 'WIT',
};

export const DEFAULT_TIMEZONE = 'Asia/Makassar';

// ==========================================
// LABEL
// ==========================================

/**
 * Label singkat timezone Indonesia.
 *
 * @example
 *   timezoneLabel('Asia/Makassar')  // "WITA"
 *   timezoneLabel('Asia/Jakarta')   // "WIB"
 *   timezoneLabel('Europe/Paris')   // "Europe/Paris"
 */
export function timezoneLabel(tz: string | null | undefined): string {
    if (!tz) return '-';
    return TZ_LABELS[tz] ?? tz;
}

/**
 * Label panjang timezone dengan offset UTC.
 *
 * @example
 *   timezoneLabelLong('Asia/Makassar')  // "WITA (+08:00)"
 */
export function timezoneLabelLong(tz: string | null | undefined): string {
    if (!tz) return '-';

    const short = TZ_LABELS[tz];
    if (!short) return tz;

    const offset = timezoneOffset(tz);
    return `${short} (${offset})`;
}

/**
 * Offset UTC timezone, format `+HH:MM`.
 *
 * `Intl.DateTimeFormat` dengan `shortOffset` mengembalikan "GMT+8"
 * atau "GMT+08:00" tergantung environment. Fungsi ini menormalkan
 * ke format `+HH:MM` yang konsisten.
 *
 * @example
 *   timezoneOffset('Asia/Makassar')  // "+08:00"
 */
export function timezoneOffset(tz: string): string {
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            timeZoneName: 'shortOffset',
        }).formatToParts(new Date());

        const tzPart = parts.find((p) => p.type === 'timeZoneName');
        if (!tzPart) return '+00:00';

        // Normalisasi "GMT+8" / "GMT+08:00" / "GMT+08.00" → "+08:00"
        const raw = tzPart.value.replace('GMT', '').trim();
        if (!raw) return '+00:00';

        // Sudah format HH:MM (mis. "+08:00" atau "-03:30")
        const hm = raw.match(/^([+-])(\d{2}):(\d{2})$/);
        if (hm) return raw;

        // Format "+8" / "+8.5" / "-3"
        const simple = raw.match(/^([+-])(\d{1,2})(?:[.:](\d{1,2}))?$/);
        if (simple) {
            const sign = simple[1];
            const hour = simple[2].padStart(2, '0');
            const minute = (simple[3] ?? '00').padStart(2, '0');
            return `${sign}${hour}:${minute}`;
        }

        return '+00:00';
    } catch {
        return '+00:00';
    }
}

// ==========================================
// "TODAY" — TIMEZONE AWARE
// ==========================================

/**
 * Return tanggal "hari ini" di timezone tertentu, format `YYYY-MM-DD`.
 *
 * ⚠️ DILARANG pakai `new Date().toISOString().slice(0, 10)` untuk ini.
 * Itu pakai UTC, bukan timezone yang diinginkan.
 *
 * @example
 *   todayInTimezone('Asia/Makassar')  // "2026-10-17"
 */
export function todayInTimezone(tz: string = DEFAULT_TIMEZONE): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(new Date());

    const year = parts.find((p) => p.type === 'year')!.value;
    const month = parts.find((p) => p.type === 'month')!.value;
    const day = parts.find((p) => p.type === 'day')!.value;

    return `${year}-${month}-${day}`;
}

/**
 * Cek apakah sebuah tanggal (DATE string) adalah "hari ini" di timezone tertentu.
 *
 * @example
 *   isTodayInTimezone('2026-10-17', 'Asia/Makassar')
 */
export function isTodayInTimezone(
    dateStr: string | null | undefined,
    tz: string = DEFAULT_TIMEZONE,
): boolean {
    if (!dateStr) return false;
    return normalizeDate(dateStr) === todayInTimezone(tz);
}

/**
 * Cek apakah "sekarang" (waktu UTC) sudah melewati sebuah DATE di timezone tertentu.
 *
 * Berguna untuk validasi "hari sudah lewat".
 */
export function isPastInTimezone(
    dateStr: string | null | undefined,
    tz: string = DEFAULT_TIMEZONE,
): boolean {
    if (!dateStr) return false;
    return normalizeDate(dateStr) < todayInTimezone(tz);
}

/**
 * Cek apakah sebuah DATE masih di masa depan di timezone tertentu.
 */
export function isFutureInTimezone(
    dateStr: string | null | undefined,
    tz: string = DEFAULT_TIMEZONE,
): boolean {
    if (!dateStr) return false;
    return normalizeDate(dateStr) > todayInTimezone(tz);
}

// ==========================================
// DATE RANGE
// ==========================================

/**
 * Cek apakah sebuah DATE berada dalam range [start, end] (inklusif).
 *
 * Semua input DATE murni (netral timezone), perbandingan langsung string
 * karena YYYY-MM-DD lexicographic == chronological.
 */
export function isDateInRange(
    dateStr: string | null | undefined,
    startStr: string | null | undefined,
    endStr: string | null | undefined,
): boolean {
    if (!dateStr || !startStr || !endStr) return false;

    const d = normalizeDate(dateStr);
    const s = normalizeDate(startStr);
    const e = normalizeDate(endStr);

    return d >= s && d <= e;
}

// ==========================================
// INTERNAL
// ==========================================

/**
 * Normalize DATE ke `YYYY-MM-DD`.
 *
 * Terima:
 * - "2026-10-17" (string DATE murni)
 * - "2026-10-17T00:00:00.000Z" (ISO timestamp)
 * - Date object
 *
 * Catatan: untuk ISO timestamp, kita ambil tanggal UTC (bukan tanggal
 * di timezone target). Ini konsisten dengan asumsi backend mengirim DATE
 * murni sebagai `YYYY-MM-DD`; ISO timestamp hanya diterima sebagai
 * fallback untuk nilai yang tidak ternormalisasi.
 */
function normalizeDate(value: string | Date): string {
    if (typeof value === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;

        return date.toISOString().slice(0, 10);
    }

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString().slice(0, 10);
    }

    return '';
}

// ==========================================
// RE-EXPORT formatDate untuk kemudahan
// ==========================================

export { formatDate };