/**
 * Types untuk filter bar & tab status.
 *
 * Dipakai oleh:
 * - `<StatusTabs>` (StatusTab)
 * - `<FilterBar>` (KategoriOption, StatusTab)
 * - utils/filters.svelte.ts (FilterQuery)
 */

// ==========================================
// STATUS TAB
// ==========================================

/**
 * Satu tab di `<StatusTabs>`.
 *
 * @example
 *   const tabs: StatusTab[] = [
 *       { value: '', label: 'Semua', count: 20 },
 *       { value: 'pending_payment', label: 'Pending', count: 5 },
 *   ];
 */
export type StatusTab = {
    value: string;
    label: string;
    count?: number;
};

// ==========================================
// KATEGORI OPTION
// ==========================================

/**
 * Satu opsi di dropdown kategori.
 *
 * @example
 *   const options: KategoriOption[] = [
 *       { value: '', label: 'Semua Kategori' },
 *       { value: 'budaya', label: 'Budaya' },
 *   ];
 */
export type KategoriOption = {
    value: string;
    label: string;
};

// ==========================================
// FILTER QUERY
// ==========================================

/**
 * Nilai yang bisa dikirim ke Inertia sebagai query param.
 *
 * Compatible dengan `RequestPayload` dari Inertia v2.
 */
export type QueryValue = string | number | boolean | null | undefined;

/**
 * Query param yang dibangun dari state filter.
 *
 * @example
 *   buildQuery: (): FilterQuery => ({
 *       search: search.state,
 *       status: status.state,
 *       page: page.state,
 *   });
 */
export type FilterQuery = Record<string, QueryValue>;