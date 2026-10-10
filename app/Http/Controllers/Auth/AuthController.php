<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Services\Auth\AuthService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\AbstractProvider;
use Symfony\Component\HttpFoundation\RedirectResponse as SymfonyRedirectResponse;

class AuthController extends Controller
{
    protected AuthService $authService;

    public function __construct(AuthService $authService)
    {
        $this->authService = $authService;
    }

    /**
     * Tampilkan Halaman Login (Svelte).
     */
    public function showLogin(): InertiaResponse
    {
        return Inertia::render('Auth/Login');
    }

    /**
     * Tampilkan Halaman Register (Svelte).
     */
    public function showRegister(): InertiaResponse
    {
        return Inertia::render('Auth/Register');
    }

    /**
     * Proses pendaftaran Client secara manual.
     */
    public function register(RegisterRequest $request): RedirectResponse
    {
        $this->authService->registerClient($request->validated());

        return redirect()->route('client.dashboard');
    }

    /**
     * Proses Login Manual (Username/Email).
     */
    public function login(LoginRequest $request): RedirectResponse
    {
        $user = $this->authService->login(
            $request->identitas,
            $request->password,
            $request->boolean('remember')
        );

        return $this->redirectBasedOnRole($user->role);
    }

    /**
     * Arahkan pengguna ke halaman login Google.
     */
    public function redirectToGoogle(): SymfonyRedirectResponse
    {
        /** @var AbstractProvider $driver */
        $driver = Socialite::driver('google');

        return $driver->stateless()->redirect();
    }

    /**
     * Tangkap data balasan dari Google setelah user memilih akun.
     */
    public function handleGoogleCallback(): RedirectResponse
    {
        /** @var AbstractProvider $driver */
        $driver = Socialite::driver('google');

        $googleUser = $driver->stateless()->user();

        $user = $this->authService->handleGoogleLogin($googleUser);

        return $this->redirectBasedOnRole($user->role);
    }

    /**
     * Proses Keluar (Logout).
     */
    public function logout(Request $request): RedirectResponse
    {
        $this->authService->logout();

        return redirect('/');
    }

    /**
     * Fungsi Helper untuk mengarahkan pengguna berdasarkan Role.
     */
    private function redirectBasedOnRole(string $role): RedirectResponse
    {
        return match ($role) {
            'admin' => redirect()->route('admin.dashboard'),
            'mitra' => redirect()->route('mitra.dashboard'),
            default => redirect()->route('client.dashboard'),
        };
    }
}