import { createInertiaApp } from '@inertiajs/svelte';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

/**
 * Nama cookie yang menyimpan timezone viewer.
 *
 * HARUS SINKRON dengan `HandleInertiaRequests::VIEWER_TZ_COOKIE`.
 */
const VIEWER_TZ_COOKIE = 'viewer_timezone';

/**
 * Set cookie `viewer_timezone` berdasarkan timezone browser.
 *
 * Cookie ini dibaca server-side (HandleInertiaRequests) untuk
 * mengisi shared prop `viewer_timezone`, yang dipakai frontend
 * untuk konversi tanggal di UI (list umum) dan label timezone
 * di momen kritis.
 *
 * Mengapa cookie, bukan localStorage?
 * - Cookie otomatis terkirim di setiap request (server bisa baca).
 * - localStorage hanya client-side, server tidak bisa akses.
 *
 * Mengapa bukan server-side?
 * - Browser timezone tidak terkirim di HTTP header standar.
 * - Harus di-set manual via JS (Intl API).
 *
 * Idempotent: kalau cookie sudah ada & sama, tidak set ulang.
 * Gagal senyap: kalau Intl API tidak support, biarkan server fallback.
 */
function syncViewerTimezoneCookie(): void {
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

        // Browser tidak support Intl → biarkan server fallback
        if (!tz) {
            return;
        }

        const encoded = encodeURIComponent(tz);

        // Cek apakah cookie sudah ada & sama → hindari Set-Cookie berulang
        const existing = document.cookie
            .split('; ')
            .find((row) => row.startsWith(`${VIEWER_TZ_COOKIE}=`))
            ?.split('=')[1];

        if (existing === encoded) {
            return;
        }

        // Set cookie: berlaku 1 tahun, path root, SameSite Lax
        const maxAge = 60 * 60 * 24 * 365; // detik
        const secure = window.location.protocol === 'https:' ? '; Secure' : '';

        document.cookie = [
            `${VIEWER_TZ_COOKIE}=${encoded}`,
            `max-age=${maxAge}`,
            'path=/',
            'SameSite=Lax',
        ].join('; ') + secure;
    } catch {
        // Abaikan — server akan fallback ke user timezone atau default
    }
}

// Panggil SEBELUM createInertiaApp supaya request pertama
// sudah membawa cookie viewer_timezone.
syncViewerTimezoneCookie();

void createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    progress: {
        color: '#4B5563',
    },
});