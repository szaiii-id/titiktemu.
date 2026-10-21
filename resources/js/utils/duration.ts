/**
 * Helper format durasi trip.
 *
 * Semua fungsi pure — tidak akses state global.
 */

// ==========================================
// FORMAT
// ==========================================

/**
 * Format durasi ringkas.
 *
 * @example
 *   formatDurasi(2, 1)  // "2D1N"
 *   formatDurasi(3, 2)  // "3D2N"
 *   formatDurasi(1, 0)  // "1 Hari"
 *   formatDurasi(2, 0)  // "2 Hari"
 */
export function formatDurasi(hari: number, malam: number): string {
    if (!Number.isFinite(hari) || hari <= 0) return '-';
    if (malam <= 0) return `${hari} Hari`;
    return `${hari}D${malam}N`;
}

/**
 * Format durasi panjang (dengan spasi).
 *
 * @example
 *   formatDurasiLong(2, 1)  // "2 Hari 1 Malam"
 */
export function formatDurasiLong(hari: number, malam: number): string {
    if (!Number.isFinite(hari) || hari <= 0) return '-';

    const parts: string[] = [`${hari} Hari`];
    if (malam > 0) parts.push(`${malam} Malam`);

    return parts.join(' ');
}

// ==========================================
// HITUNG DARI RANGE
// ==========================================

/**
 * Hitung durasi hari dari range DATE (inklusif).
 *
 * @example
 *   hitungDurasiHari('2026-10-17', '2026-10-18')  // 2
 *   hitungDurasiHari('2026-10-17', '2026-10-17')  // 1
 */
export function hitungDurasiHari(
    mulai: string | null | undefined,
    selesai: string | null | undefined,
): number {
    if (!mulai || !selesai) return 0;

    const start = parseDateOnly(mulai);
    const end = parseDateOnly(selesai);

    if (!start || !end) return 0;

    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    return diffDays + 1;
}

/**
 * Hitung durasi malam dari range DATE.
 *
 * @example
 *   hitungDurasiMalam('2026-10-17', '2026-10-18')  // 1
 */
export function hitungDurasiMalam(
    mulai: string | null | undefined,
    selesai: string | null | undefined,
): number {
    const hari = hitungDurasiHari(mulai, selesai);
    return Math.max(0, hari - 1);
}

/**
 * Format durasi dari range DATE.
 *
 * @example
 *   formatDurasiFromRange('2026-10-17', '2026-10-18')  // "2D1N"
 */
export function formatDurasiFromRange(
    mulai: string | null | undefined,
    selesai: string | null | undefined,
): string {
    return formatDurasi(hitungDurasiHari(mulai, selesai), hitungDurasiMalam(mulai, selesai));
}

// ==========================================
// INTERNAL
// ==========================================

function parseDateOnly(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (!match) return null;

    const [, year, month, day] = match;
    const date = new Date(Date.UTC(+year, +month - 1, +day));

    return Number.isNaN(date.getTime()) ? null : date;
}