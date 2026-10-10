<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Services\Auth\AuthService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Laravel\Socialite\Facades\Socialite;

class AuthController extends Controller
{
    protected $authService;

    // Menyuntikkan AuthService ke dalam Controller
    public function __construct(AuthService $authService)
    {
        $this->authService = $authService;
    }

    /**
     * Tampilkan Halaman Login (Svelte)
     */
    public function showLogin()
    {
        return Inertia::render('Auth/Login');
    }

    /**
     * Tampilkan Halaman Register (Svelte)
     */
    public function showRegister()
    {
        return Inertia::render('Auth/Register');
    }

    /**
     * Proses pendaftaran Client secara manual
     */
    public function register(RegisterRequest $request)
    {
        // 1. Data sudah otomatis tervalidasi bersih melalui RegisterRequest
        // 2. Lempar data tervalidasi ke Service untuk disimpan & login
        $this->authService->registerClient($request->validated());

        // 3. Arahkan ke Dasbor Client
        return redirect()->route('client.dashboard');
    }

    /**
     * Proses Login Manual (Username/Email)
     */
    public function login(LoginRequest $request)
    {
        // 1. Data sudah otomatis tervalidasi bersih melalui LoginRequest
        // 2. Lempar ke Service
        $user = $this->authService->login(
            $request->identitas,
            $request->password,
            $request->boolean('remember')
        );

        // 3. Arahkan ke dasbor sesuai Role menggunakan fungsi helper di bawah
        return $this->redirectBasedOnRole($user->role);
    }

    /**
     * Arahkan pengguna ke halaman login Google
     */
    public function redirectToGoogle()
    {
        return Socialite::driver('google')->stateless()->redirect();
    }

    /**
     * Tangkap data balasan dari Google setelah user memilih akun
     */
    public function handleGoogleCallback()
    {
        $googleUser = Socialite::driver('google')->stateless()->user();

        $user = $this->authService->handleGoogleLogin($googleUser);

        return $this->redirectBasedOnRole($user->role);
    }

    /**
     * Proses Keluar (Logout)
     */
    public function logout(Request $request)
    {
        $this->authService->logout();

        return redirect('/'); // Kembali ke Landing Page
    }

    /**
     * Fungsi Helper untuk mengarahkan pengguna berdasarkan Role
     */
    private function redirectBasedOnRole(string $role)
    {
        return match ($role) {
            'admin' => redirect()->route('admin.dashboard'),
            'mitra' => redirect()->route('mitra.dashboard'),
            default => redirect()->route('client.dashboard'),
        };
    }
}
