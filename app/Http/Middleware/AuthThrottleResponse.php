<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpFoundation\Response;

class AuthThrottleResponse
{
    public function handle(Request $request, Closure $next, string $limiterName): Response
    {
        $key = $this->resolveKey($request, $limiterName);
        $maxAttempts = $this->maxAttempts($limiterName);
        $decaySeconds = $this->decaySeconds($limiterName);

        if (RateLimiter::tooManyAttempts($key, $maxAttempts)) {
            $seconds = max(RateLimiter::availableIn($key), 1);

            return back()
                ->withErrors($this->errorBag($limiterName, $seconds))
                ->with('retry_after', $seconds);
        }

        RateLimiter::hit($key, $decaySeconds);

        return $next($request);
    }

    /**
     * Tentukan key rate limiter berdasarkan tipe limiter.
     */
    protected function resolveKey(Request $request, string $limiterName): string
    {
        return match ($limiterName) {
            'login' => mb_strtolower((string) $request->input('identitas')) . '|' . $request->ip(),
            'register' => mb_strtolower((string) $request->input('email')) . '|' . $request->ip(),
            'forgot-password' => mb_strtolower((string) $request->input('email')) . '|' . $request->ip(),
            'reset-password' => mb_strtolower((string) $request->input('email')) . '|' . $request->ip(),
            default => $request->ip(),
        };
    }

    /**
     * Ambil jumlah percobaan maksimal dari config.
     *
     * Mendukung override via env untuk test rate limit:
     *   AUTH_THROTTLE_LOGIN_TEST_OVERRIDE=5
     *   AUTH_THROTTLE_REGISTER_TEST_OVERRIDE=3
     *   AUTH_THROTTLE_FORGOT_PASSWORD_TEST_OVERRIDE=3
     *   AUTH_THROTTLE_RESET_PASSWORD_TEST_OVERRIDE=5
     */
    protected function maxAttempts(string $limiterName): int
    {
        $overrideKey = 'AUTH_THROTTLE_' . strtoupper(str_replace('-', '_', $limiterName)) . '_TEST_OVERRIDE';
        $override = env($overrideKey);
        if ($override !== null && $override !== '') {
            return (int) $override;
        }

        return (int) config("auth-throttle.{$limiterName}.max_attempts", 5);
    }

    /**
     * Ambil durasi decay dari config.
     */
    protected function decaySeconds(string $limiterName): int
    {
        return (int) config("auth-throttle.{$limiterName}.decay_seconds", 60);
    }

    /**
     * Susun pesan error sesuai limiter.
     */
    protected function errorBag(string $limiterName, int $seconds): array
    {
        $minutes = (int) ceil($seconds / 60);
        $display = $minutes === 1 ? '1 menit' : "{$minutes} menit";

        return match ($limiterName) {
            'login' => ['identitas' => "Terlalu banyak percobaan login. Coba lagi dalam {$display}."],
            'register' => ['email' => "Terlalu banyak percobaan pendaftaran. Coba lagi dalam {$display}."],
            'forgot-password' => ['email' => "Terlalu banyak permintaan reset password. Coba lagi dalam {$display}."],
            'reset-password' => ['email' => "Terlalu banyak percobaan reset password. Coba lagi dalam {$display}."],
            default => ['email' => "Terlalu banyak percobaan. Coba lagi dalam {$display}."],
        };
    }
}