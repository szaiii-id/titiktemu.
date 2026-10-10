<?php

namespace App\Services\Auth;

use App\Repositories\Contracts\UserRepositoryInterface;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthService
{
    protected $userRepository;

    // Menyuntikkan (inject) UserRepository yang sudah kita buat sebelumnya
    public function __construct(UserRepositoryInterface $userRepository)
    {
        $this->userRepository = $userRepository;
    }

    /**
     * Logika untuk mendaftarkan Client baru
     */
    public function registerClient(array $data)
    {
        // Menyimpan data menggunakan repository
        $user = $this->userRepository->createClient($data);

        // Langsung login-kan user setelah berhasil daftar
        Auth::login($user);

        return $user;
    }

    /**
     * Logika Dual-Login (Username / Email)
     */
    public function login(string $identitas, string $password, bool $remember = false)
    {
        // 1. Cari user berdasarkan email atau username
        $user = $this->userRepository->findByEmailOrUsername($identitas);

        // 2. Jika user tidak ditemukan ATAU password salah
        if (!$user || !Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'identitas' => ['Kredensial yang diberikan tidak cocok dengan data kami.'],
            ]);
        }

        // 3. Jika cocok, login-kan ke sistem
        Auth::login($user, $remember);

        return $user;
    }

    /**
     * Logika untuk Login menggunakan Google (SSO)
     */
    public function handleGoogleLogin($googleUser)
    {
        // 1. Cek apakah user dengan Google ID ini sudah pernah login
        $user = $this->userRepository->findByGoogleId($googleUser->getId());

        if (!$user) {
            // 2. Jika belum, cek apakah email-nya sudah terdaftar secara manual sebelumnya
            $user = $this->userRepository->findByEmail($googleUser->getEmail());

            if ($user) {
                // Jika email sudah ada, tautkan akun Google ini ke akun yang sudah ada
                $user->update(['google_id' => $googleUser->getId()]);
            } else {
                // 3. Jika benar-benar user baru, buatkan akun Client otomatis
                // Kita buatkan username acak dari email (misal: budi.123)
                $usernameLokal = explode('@', $googleUser->getEmail())[0] . rand(100, 999);

                $user = $this->userRepository->createClient([
                    'name'      => $googleUser->getName(),
                    'email'     => $googleUser->getEmail(),
                    'username'  => $usernameLokal,
                    'google_id' => $googleUser->getId(),
                    'password'  => null, // Password kosong karena login via Google
                ]);
            }
        }

        // Login-kan secara otomatis tanpa 'remember' karena ini SSO
        Auth::login($user);

        return $user;
    }

    /**
     * Logika Logout & menghapus sesi
     */
    public function logout()
    {
        Auth::logout();

        // Regenerasi session untuk mencegah serangan Session Fixation
        request()->session()->invalidate();
        request()->session()->regenerateToken();
    }
}