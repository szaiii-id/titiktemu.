/**
 * Helper form — parse Rupiah, deteksi perubahan, dan util umum.
 */

// ==========================================
// PARSE RUPIAH
// ==========================================

/**
 * Parse input user (string) menjadi number.
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
 * @example
 *   parseRupiah('850.000')  // 850000
 */
export function parseRupiah(value: string | number | null | undefined): number {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return Number.isNaN(value) ? 0 : value;

    let cleaned = value.toString().trim().replace(/^Rp\s*/i, '');

    const hasDot = cleaned.includes('.');
    const hasComma = cleaned.includes(',');

    if (hasDot && hasComma) {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (hasDot) {
        const parts = cleaned.split('.');
        if (parts.length > 2 || (parts[1] && parts[1].length === 3)) {
            cleaned = cleaned.replace(/\./g, '');
        }
    } else if (hasComma) {
        cleaned = cleaned.replace(',', '.');
    }

    const num = parseFloat(cleaned);
    return Number.isNaN(num) ? 0 : num;
}

/**
 * Format angka jadi string input Rupiah (tanpa "Rp", dengan titik ribuan).
 *
 * @example
 *   formatRupiahInput(850000)  // "850.000"
 */
export function formatRupiahInput(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) return '';

    return new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

// ==========================================
// PARSE INTEGER (untuk jumlah peserta, hari, dll)
// ==========================================

/**
 * Parse input user ke integer (buang non-digit).
 *
 * @example
 *   parseIntInput('12')       // 12
 *   parseIntInput('1.500')    // 1500
 *   parseIntInput('abc')      // 0
 */
export function parseIntInput(value: string | number | null | undefined): number {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') {
        return Number.isFinite(value) ? Math.trunc(value) : 0;
    }

    const digitsOnly = value.replace(/\D/g, '');
    return digitsOnly === '' ? 0 : parseInt(digitsOnly, 10);
}

// ==========================================
// DETEKSI PERUBAHAN FORM
// ==========================================

/**
 * Cek apakah dua object punya nilai berbeda (shallow compare).
 *
 * Berguna untuk tombol "Simpan" disabled saat tidak ada perubahan.
 *
 * @example
 *   hasFormChanges({ name: 'A' }, { name: 'B' })  // true
 *   hasFormChanges({ name: 'A' }, { name: 'A' })  // false
 */
export function hasFormChanges<T extends Record<string, unknown>>(
    current: T,
    initial: T,
): boolean {
    const keys = new Set([...Object.keys(current), ...Object.keys(initial)]);

    for (const key of keys) {
        const a = normalizeForCompare(current[key]);
        const b = normalizeForCompare(initial[key]);

        if (a !== b) return true;
    }

    return false;
}

// ==========================================
// TRIM OBJECT
// ==========================================

/**
 * Trim semua string value pada object (shallow).
 *
 * @example
 *   trimObject({ nama: '  Budi  ', email: ' a@b.c ' })
 *   // { nama: 'Budi', email: 'a@b.c' }
 */
export function trimObject<T extends Record<string, unknown>>(obj: T): T {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
        result[key] = typeof value === 'string' ? value.trim() : value;
    }

    return result as T;
}

// ==========================================
// EMPTY CHECK
// ==========================================

/**
 * Cek apakah value kosong (null, undefined, '', []).
 */
export function isEmpty(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    return false;
}

// ==========================================
// INTERNAL
// ==========================================

function normalizeForCompare(value: unknown): unknown {
    // Number string "5" vs number 5 dianggap sama
    if (typeof value === 'string' && value.trim() !== '') {
        const asNumber = Number(value);
        if (!Number.isNaN(asNumber)) return asNumber;
        return value.trim();
    }

    if (typeof value === 'number') return value;
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value.trim();

    return JSON.stringify(value);
}