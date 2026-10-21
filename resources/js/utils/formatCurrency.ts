/**
 * Utility untuk format angka menjadi tampilan Rupiah Indonesia.
 *
 * Pemakaian:
 *
 *     import { formatCurrency, formatNumber, parseCurrency } from '@/utils/formatCurrency';
 *
 *     formatCurrency(850000);       // "Rp 850.000"
 *     formatCurrency("1500000.00"); // "Rp 1.500.000"
 *     formatCurrency(null);         // "—"
 *
 *     formatNumber(850000);         // "850.000"
 *     formatNumber(null);           // "—"
 *
 *     parseCurrency("850.000");     // 850000
 *     parseCurrency("1,5");         // 1.5
 */

/**
 * Format angka menjadi string Rupiah.
 *
 * - Selalu ada prefix "Rp " (dengan spasi).
 * - Tanpa desimal (dibulatkan).
 * - Titik sebagai pemisah ribuan.
 * - Return "—" kalau value null/undefined/empty/invalid.
 *
 * @param value  Angka, string angka (termasuk decimal cast Laravel "850000.00"),
 *               atau null/undefined.
 * @returns      String Rupiah, atau "—" kalau invalid.
 */
export function formatCurrency(
    value: number | string | null | undefined,
): string {
    const num = parseToNumber(value);

    if (num === null) {
        return '—';
    }

    return (
        'Rp ' +
        new Intl.NumberFormat('id-ID', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(num)
    );
}

/**
 * Format angka tanpa prefix "Rp".
 *
 * - Titik sebagai pemisah ribuan.
 * - Tanpa desimal.
 * - Return "—" kalau invalid.
 *
 * @param value  Angka, string angka, atau null/undefined.
 * @returns      String angka terformat, atau "—" kalau invalid.
 */
export function formatNumber(
    value: number | string | null | undefined,
): string {
    const num = parseToNumber(value);

    if (num === null) {
        return '—';
    }

    return new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(num);
}

/**
 * Parse string input user menjadi number.
 *
 * Handle format Indonesia:
 * - "850.000"    → 850000   (titik = ribuan)
 * - "1.500.000"  → 1500000
 * - "1,5"        → 1.5      (koma = desimal)
 * - "850000"     → 850000
 * - "850000.00"  → 850000   (dari decimal cast Laravel)
 * - ""           → 0
 *
 * ⚠️ AMBIGU: "1.500" — apakah 1500 (ribuan) atau 1.5 (desimal)?
 *    Kita asumsikan RIBUAN → 1500.
 *
 * @param value  String atau number.
 * @returns      Number, atau 0 kalau invalid.
 */
export function parseCurrency(value: string | number | null | undefined): number {
    if (value === null || value === undefined || value === '') {
        return 0;
    }

    if (typeof value === 'number') {
        return Number.isNaN(value) ? 0 : value;
    }

    // Bersihkan spasi & prefix "Rp"
    let cleaned = value.toString().trim().replace(/^Rp\s*/i, '');

    // Deteksi format:
    // - Kalau ada titik DAN koma → titik = ribuan, koma = desimal
    // - Kalau hanya titik → titik = ribuan (asumsi)
    // - Kalau hanya koma → koma = desimal
    const hasDot = cleaned.includes('.');
    const hasComma = cleaned.includes(',');

    if (hasDot && hasComma) {
        // Format Indonesia: 1.500.000,50
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (hasDot) {
        // Cek: apakah titik = ribuan atau desimal?
        // Kalau ada > 1 titik → pasti ribuan
        // Kalau ada 1 titik dan 3 digit setelah titik → kemungkinan ribuan
        // Kalau ada 1 titik dan bukan 3 digit setelah → kemungkinan desimal
        const parts = cleaned.split('.');
        if (parts.length > 2 || (parts[1] && parts[1].length === 3)) {
            // Ribuan
            cleaned = cleaned.replace(/\./g, '');
        }
        // else: biarkan sebagai desimal (misal "1.5")
    } else if (hasComma) {
        // Koma = desimal
        cleaned = cleaned.replace(',', '.');
    }

    const num = parseFloat(cleaned);
    return Number.isNaN(num) ? 0 : num;
}

/**
 * Parse value apapun jadi number, atau null kalau invalid/kosong.
 *
 * Internal helper — untuk formatCurrency & formatNumber.
 */
function parseToNumber(
    value: number | string | null | undefined,
): number | null {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    const num = typeof value === 'string' ? parseFloat(value) : value;

    return Number.isNaN(num) ? null : num;
}