/**
 * Types untuk pagination Laravel.
 *
 * Dipakai oleh:
 * - `<Pagination>`
 * - Semua halaman list
 */

// ==========================================
// LINK
// ==========================================

/**
 * Satu link pagination dari Laravel (`$paginator->links()`).
 *
 * - `url`: null untuk label "..." (ellipsis)
 * - `label`: string HTML (bisa berisi entity)
 * - `active`: true untuk halaman aktif
 */
export type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

// ==========================================
// META
// ==========================================

/**
 * Meta pagination dari Laravel `LengthAwarePaginator`.
 *
 * Bisa langsung dipakai sebagai props `<Pagination meta={...}>`.
 *
 * @example
 *   // Di Controller:
 *   return Inertia::render('Admin/Bookings/Index', [
 *       'bookings' => $bookings,  // LengthAwarePaginator
 *   ]);
 *
 *   // Di Svelte:
 *   <Pagination meta={bookings} label="booking" />
 */
export type PaginationMeta = {
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
    links: PaginationLink[];
    per_page?: number;
};