/**
 * Types untuk Inertia shared props & page.
 *
 * Mirror dari `HandleInertiaRequests::share()`.
 */

import type { AppNotification, User } from './models';

// ==========================================
// FLASH
// ==========================================

export type Flash = {
    status?: string | null;
    error?: string | null;
    retry_after?: number | null;
    credentials?: Credentials | null;
};

/**
 * Kredensial user yang di-flash setelah admin buat/reset user.
 * Hanya muncul 1x (di halaman berikutnya).
 */
export type Credentials = {
    role: string;
    name: string;
    email: string;
    username: string | null;
    password: string;
};

// ==========================================
// AUTH
// ==========================================

export type Auth = {
    user: User | null;
};

// ==========================================
// SHARED PROPS
// ==========================================

/**
 * Props yang di-share ke SEMUA halaman via `HandleInertiaRequests`.
 *
 * Akses di Svelte:
 *
 *     import { page } from '@inertiajs/svelte';
 *     const user = $derived(page.props.auth?.user);
 *     const flash = $derived(page.props.flash);
 *     const viewerTimezone = $derived(page.props.viewer_timezone);
 */
export type SharedProps = {
    name: string;
    auth: Auth;
    flash: Flash;
    viewer_timezone: string;
    timezone_options: Record<string, string>;
    server_timezone: string;
    unread_notifications: number;
};

// ==========================================
// PAGE PROPS (extended)
// ==========================================

/**
 * Extended Page type dengan shared props.
 *
 * Dipakai kalau butuh akses `page.props` dengan type yang ketat.
 *
 * @example
 *   import type { PageWithSharedProps } from '@/types/inertia';
 *   import { page } from '@inertiajs/svelte';
 *
 *   const user = $derived((page as PageWithSharedProps).props.auth?.user);
 */
export type PageWithSharedProps = {
    url: string;
    component: string;
    props: SharedProps & Record<string, unknown>;
};

// ==========================================
// RE-EXPORT untuk kemudahan
// ==========================================

export type { AppNotification, User };