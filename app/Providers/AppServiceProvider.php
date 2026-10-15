<?php

namespace App\Providers;

use App\Repositories\Contracts\ProfileRepositoryInterface;
use App\Repositories\Contracts\UserRepositoryInterface;
use App\Repositories\Eloquent\ProfileRepository;
use App\Repositories\Eloquent\UserRepository;
use Carbon\CarbonImmutable;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(UserRepositoryInterface::class, UserRepository::class);
        $this->app->bind(ProfileRepositoryInterface::class, ProfileRepository::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->configureRateLimiting();
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }

    /**
     * Configure rate limiters untuk endpoint tertentu.
     *
     * Rate limiter ini di-define di sini agar:
     * 1. Bisa di-override di test tanpa mengubah route.
     * 2. Konsisten antara production, testing, dan E2E.
     * 3. Route hanya perlu `throttle:contact` (named limiter).
     */
    protected function configureRateLimiting(): void
    {
        /**
         * Rate limiter untuk form kontak.
         *
         * Limit:
         * - Production: 3 request per menit per IP.
         * - Testing (Pest): 3 request per menit per IP (agar bisa di-test).
         * - E2E (Playwright): 1000 request per menit per IP (longgar).
         *
         * E2E menggunakan env `AUTH_THROTTLE_CONTACT_TEST_OVERRIDE=1000`
         * (di-set di `playwright.config.ts`).
         */
        RateLimiter::for('contact', function (Request $request) {
            $override = config('AUTH_THROTTLE_CONTACT_TEST_OVERRIDE');

            if ($override !== null && $override !== '') {
                return Limit::perMinute((int) $override)->by($request->ip());
            }

            // Default: 3 request per menit per IP
            return Limit::perMinute(3)->by($request->ip());
        });
    }
}
