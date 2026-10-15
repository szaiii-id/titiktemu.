<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\User;
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
     *
     * Client register mandiri → langsung login → dashboard client.
     * (Client tidak punya must_change_password karena password dipilih sendiri.)
     */
    public function register(RegisterRequest $request): RedirectResponse
    {
        $user = $this->authService->registerClient($request->validated());

        $redirect = $this->authService->resolveRedirectAfterLogin($user);

        return redirect()->to($redirect['url']);
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

        return $this->redirectAfterLogin($user);
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

        return $this->redirectAfterLogin($user);
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
     * Redirect setelah login berdasarkan role & status wajib ganti password.
     */
    private function redirectAfterLogin(User $user): RedirectResponse
    {
        $redirect = $this->authService->resolveRedirectAfterLogin($user);

        return redirect()->to($redirect['url']);
    }
}
