<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * Cek apakah user yang sudah login memiliki salah satu role yang diizinkan.
     * Mendukung multiple role: `role:admin,mitra`.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        // User belum login → redirect ke halaman login
        if (! $user) {
            return redirect()
                ->route('login')
                ->with('error', 'Silakan login terlebih dahulu.');
        }

        // User sudah login tapi role tidak sesuai → redirect ke dashboard-nya sendiri
        if (! in_array($user->role, $roles, true)) {
            Log::warning('Akses ditolak: role tidak sesuai', [
                'user_id' => $user->id,
                'user_role' => $user->role,
                'allowed_roles' => $roles,
                'path' => $request->path(),
                'ip' => $request->ip(),
            ]);

            return redirect()
                ->route($this->dashboardRouteFor($user->role))
                ->with('error', 'Anda tidak memiliki hak akses ke halaman tersebut.');
        }

        return $next($request);
    }

    /**
     * Tentukan nama route dashboard berdasarkan role user.
     */
    protected function dashboardRouteFor(string $role): string
    {
        return match ($role) {
            'admin' => 'admin.dashboard',
            'mitra' => 'mitra.dashboard',
            'client' => 'client.dashboard',
            default => 'home',
        };
    }
}
