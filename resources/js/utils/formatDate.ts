/**
 * Format tanggal & waktu untuk tampilan UI.
 *
 * Prinsip:
 * - Database menyimpan timestamp dalam UTC.
 * - Tampilan dikonversi ke `viewer_timezone` (dari Inertia shared prop).
 * - Tanggal murni (DATE) dianggap netral — tidak dikonversi.
 *
 * Pemakaian:
 *
 *     import { formatDate, formatDateTime, formatDateTimeTz } from '@/utils/formatDate';
 *
 *     // Tanggal saja (untuk DATE murni, netral timezone)
 *     formatDate('2026-10-16');  // "16 Okt 2026"
 *
 *     // Tanggal + waktu, dalam timezone tertentu
 *     formatDateTime('2026-10-16T07:00:00Z', 'Asia/Makassar');
 *     // "16 Okt 2026, 15:00"
 *
 *     // Tanggal + waktu + label timezone (untuk momen kritis)
 *     formatDateTimeTz('2026-10-16T07:00:00Z', 'Asia/Makassar');
 *     // "16 Okt 2026, 15:00 WITA"
 */

/**
 * Label singkat timezone Indonesia.
 *
 * IANA → label. Untuk timezone di luar daftar, fallback ke offset.
 */
const TZ_LABELS: Record<string, string> = {
    'Asia/Jakarta': 'WIB',
    'Asia/Makassar': 'WITA',
    'Asia/Jayapura': 'WIT',
};

/**
 * Opsi locale Indonesia untuk `Intl.DateTimeFormat`.
 */
const LOCALE = 'id-ID';

/**
 * Ambil jam & menit dari Date dalam timezone tertentu, dalam format HH:mm.
 *
 * Mengapa tidak langsung `Intl.DateTimeFormat(...).format(date)`?
 * Karena locale `id-ID` menggunakan pemisah titik (mis. "15.00")
 * untuk jam. Kita ingin format universal dengan titik dua ("15:00").
 *
 * `formatToParts` memberi kita bagian jam/menit secara eksplisit,
 * sehingga tidak bergantung pada pemisah locale.
 */
function getHourMinute(date: Date, timezone?: string): string {
    const parts = new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: timezone || undefined,
    }).formatToParts(date);

    const hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
    const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';

    return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
}

/**
 * Format tanggal murni (DATE) menjadi string lokal Indonesia.
 *
 * Untuk kolom DATE seperti `tanggal_keberangkatan`, `tanggal_mulai`,
 * `trip_days.tanggal`. Tidak ada konversi timezone karena input
 * dianggap netral (tanggal kalender).
 *
 * Contoh: '2026-10-16' → "16 Okt 2026"
 *
 * @param value  String ISO date ('2026-10-16') atau Date object.
 * @returns      String tanggal lokal, atau '—' kalau input invalid.
 */
export function formatDate(value: string | Date | null | undefined): string {
    if (!value) {
        return '—';
    }

    // Kalau string 'YYYY-MM-DD' murni, parse manual untuk hindari
    // pergeseran timezone (Date('2026-10-16') di JS dianggap UTC).
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] = value.split('-').map(Number);
        // Bulan di JS 0-indexed (0 = Januari)
        const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

        return new Intl.DateTimeFormat(LOCALE, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            timeZone: 'UTC', // ← jaga agar tanggal tidak bergeser
        }).format(date);
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '—';
    }

    return new Intl.DateTimeFormat(LOCALE, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(date);
}

/**
 * Format tanggal + waktu (timestamp UTC) dalam timezone tertentu.
 *
 * Untuk kolom TIMESTAMP seperti `submitted_at`, `created_at`, `paid_at`.
 *
 * Contoh:
 *   formatDateTime('2026-10-16T07:00:00Z', 'Asia/Makassar')
 *   → "16 Okt 2026, 15:00"
 *
 * @param value    String ISO timestamp atau Date object.
 * @param timezone IANA timezone tujuan. Default: browser timezone.
 * @returns        String tanggal + waktu, atau '—' kalau invalid.
 */
export function formatDateTime(
    value: string | Date | null | undefined,
    timezone?: string,
): string {
    const date = parseDateTime(value);
    if (!date) {
        return '—';
    }

    const datePart = new Intl.DateTimeFormat(LOCALE, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: timezone || undefined,
    }).format(date);

    const timePart = getHourMinute(date, timezone);

    return `${datePart}, ${timePart}`;
}

/**
 * Sama seperti `formatDateTime`, tapi menambahkan label timezone
 * (WIB/WITA/WIT) di akhir.
 *
 * Dipakai untuk **momen kritis** seperti trip start, deadline
 * daily report, deadline payout — di mana user perlu tahu
 * timezone acuan secara eksplisit.
 *
 * Contoh:
 *   formatDateTimeTz('2026-10-16T07:00:00Z', 'Asia/Makassar')
 *   → "16 Okt 2026, 15:00 WITA"
 *
 * @param value    String ISO timestamp atau Date object.
 * @param timezone IANA timezone tujuan. Default: browser timezone.
 * @returns        String tanggal + waktu + label TZ, atau '—' kalau invalid.
 */
export function formatDateTimeTz(
    value: string | Date | null | undefined,
    timezone?: string,
): string {
    const date = parseDateTime(value);
    if (!date) {
        return '—';
    }

    const datePart = new Intl.DateTimeFormat(LOCALE, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: timezone || undefined,
    }).format(date);

    const timePart = getHourMinute(date, timezone);
    const tzLabel = timezone ? TZ_LABELS[timezone] : undefined;

    const base = `${datePart}, ${timePart}`;
    return tzLabel ? `${base} ${tzLabel}` : base;
}

/**
 * Format jam saja (HH:mm) dalam timezone tertentu.
 *
 * Berguna untuk itinerary day (jam_mulai, jam_selesai).
 *
 * @param value    String ISO timestamp, Date, atau string 'HH:mm'.
 * @param timezone IANA timezone tujuan. Default: browser timezone.
 * @returns        String jam, atau '—' kalau invalid.
 */
export function formatTime(
    value: string | Date | null | undefined,
    timezone?: string,
): string {
    if (!value) {
        return '—';
    }

    // Kalau input sudah 'HH:mm' (dari kolom TIME di DB), return apa adanya
    if (typeof value === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(value)) {
        return value.slice(0, 5); // ambil 'HH:mm' saja
    }

    const date = parseDateTime(value);
    if (!date) {
        return '—';
    }

    return getHourMinute(date, timezone);
}

/**
 * Parse input apapun menjadi Date object, atau null kalau invalid.
 *
 * Mengapa tidak langsung `new Date(value)`?
 * - `new Date(null)` → epoch 1970, bukan invalid.
 * - `new Date('')` → invalid.
 * - `new Date('bukan tanggal')` → invalid.
 *
 * Helper ini memastikan kita dapat `null` yang konsisten untuk
 * semua input invalid/empty.
 */
function parseDateTime(
    value: string | Date | null | undefined,
): Date | null {
    if (!value) {
        return null;
    }

    const date = value instanceof Date ? value : new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
}