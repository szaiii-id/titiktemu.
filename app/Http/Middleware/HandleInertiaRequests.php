<?php

namespace App\Http\Middleware;

use App\Models\AppNotification;
use App\Support\Timezone;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * Nama cookie yang menyimpan timezone viewer (di-set dari client-side).
     *
     * Cookie ini di-set di `resources/js/app.ts` saat aplikasi boot,
     * berdasarkan `Intl.DateTimeFormat().resolvedOptions().timeZone`.
     */
    public const VIEWER_TZ_COOKIE = 'viewer_timezone';

    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $request->user(),
            ],
            'flash' => [
                'status' => fn () => $request->session()->get('status'),
                'error' => fn () => $request->session()->get('error'),
                'retry_after' => fn () => $request->session()->get('retry_after'),
                'credentials' => fn () => $request->session()->get('credentials'),
            ],
            // ==========================================
            // TIMEZONE
            // ==========================================
            // Timezone viewer (dari cookie browser, fallback ke default).
            // Dipakai frontend untuk konversi tanggal di UI.
            'viewer_timezone' => fn (): string => $this->resolveViewerTimezone($request),

            // Daftar timezone untuk dropdown di form.
            // Format: [value => label], contoh: ['Asia/Makassar' => 'WITA (UTC+8)']
            'timezone_options' => fn (): array => Timezone::options(),

            // Timezone server saat ini (untuk debugging & test).
            // Seharusnya selalu 'UTC' sesuai config/app.php.
            'server_timezone' => fn (): mixed => config('app.timezone'),

            'unread_notifications' => fn (): int => $request->user() !== null
                ? AppNotification::where('user_id', $request->user()->id)->whereNull('read_at')->count()
                : 0,
        ];
    }

    /**
     * Resolve timezone viewer dari cookie browser.
     *
     * Prioritas:
     * 1. Cookie `viewer_timezone` (di-set client-side dari Intl API).
     * 2. Timezone user yang login (kalau ada & valid).
     * 3. Timezone default (Asia/Makassar).
     *
     * Fallback berlapis ini memastikan:
     * - User yang belum login tetap punya timezone (dari browser).
     * - Kalau browser tidak support Intl API, pakai timezone user dari DB.
     * - Kalau dua-duanya gagal, pakai default.
     */
    protected function resolveViewerTimezone(Request $request): string
    {
        // 1. Coba dari cookie
        $cookieTz = $request->cookie(self::VIEWER_TZ_COOKIE);
        if (is_string($cookieTz) && Timezone::isValid($cookieTz)) {
            return $cookieTz;
        }

        // 2. Fallback ke timezone user yang login
        $user = $request->user();
        if ($user !== null && Timezone::isValid($user->timezone)) {
            return (string) $user->timezone;
        }

        // 3. Fallback ke default
        return Timezone::DEFAULT;
    }
}
