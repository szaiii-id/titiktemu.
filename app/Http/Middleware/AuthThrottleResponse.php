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
        $input = match ($limiterName) {
            'login' => $request->input('identitas'),
            'register' => $request->input('email'),
            'forgot-password' => $request->input('email'),
            'reset-password' => $request->input('email'),
            default => null,
        };

        // Cast ke string + fallback '' kalau gagal.
        $normalized = match (true) {
            is_array($input) => (string) json_encode($input),
            is_object($input) => (string) json_encode($input),
            is_scalar($input) => (string) $input,
            default => '',
        };

        return mb_strtolower($normalized).'|'.$request->ip();
    }

    /**
     * Ambil jumlah percobaan maksimal dari config.
     *
     * Override bisa dilakukan via config `auth-throttle.{limiter}.test_override`
     * yang dibaca dari env (di file config), bukan langsung dari env di sini.
     */
    protected function maxAttempts(string $limiterName): int
    {
        $override = config("auth-throttle.{$limiterName}.test_override");
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
     *
     * @return array<string, string>
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
