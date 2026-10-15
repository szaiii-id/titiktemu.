<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePasswordChanged
{
    /**
     * Handle an incoming request.
     *
     * Jika user login memiliki flag `must_change_password = true`,
     * maka user hanya diizinkan mengakses halaman ganti password & logout.
     * Semua request lain akan di-redirect ke halaman ganti password.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Skip jika tidak ada user login
        if (! $user) {
            return $next($request);
        }

        // Skip jika user tidak dalam status wajib ganti password
        if (! $user->must_change_password) {
            return $next($request);
        }

        // Izinkan akses ke halaman ganti password & logout
        if ($this->isAllowedRoute($request)) {
            return $next($request);
        }

        // Redirect ke halaman ganti password
        return redirect()
            ->route('password.change')
            ->with('error', 'Anda harus mengganti password terlebih dahulu sebelum melanjutkan.');
    }

    /**
     * Cek apakah request diarahkan ke route yang diizinkan.
     */
    protected function isAllowedRoute(Request $request): bool
    {
        return $request->routeIs('password.change')
            || $request->routeIs('password.change.update')
            || $request->routeIs('logout');
    }
}
