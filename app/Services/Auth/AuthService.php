<?php

namespace App\Services\Auth;

use App\Models\User;
use App\Repositories\Contracts\UserRepositoryInterface;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Laravel\Socialite\Contracts\User as SocialiteUser;

class AuthService
{
    protected UserRepositoryInterface $userRepository;

    public function __construct(UserRepositoryInterface $userRepository)
    {
        $this->userRepository = $userRepository;
    }

    /**
     * Logika untuk mendaftarkan Client baru.
     *
     * @param  array<string, mixed>  $data
     */
    public function registerClient(array $data): User
    {
        $user = $this->userRepository->createClient($data);

        Auth::login($user);

        return $user;
    }

    /**
     * Logika Dual-Login (Username / Email).
     *
     * @throws ValidationException
     */
    public function login(string $identitas, string $password, bool $remember = false): User
    {
        $user = $this->userRepository->findByEmailOrUsername($identitas);

        // ⚠️ LOG DEBUG
        Log::info('=== AUTH SERVICE: LOGIN CHECK ===', [
            'identitas_input' => $identitas,
            'password_length' => strlen($password),
            'user_found' => $user !== null,
            'user_id' => $user?->id,
            'user_email' => $user?->email,
            'user_username' => $user?->username,
            'user_role' => $user?->role,
            'hash_check' => $user ? Hash::check($password, $user->password) : null,
            'password_hash_in_db' => $user?->password,
        ]);

        if (! $user || ! Hash::check($password, $user->password)) {
            Log::warning('=== AUTH SERVICE: LOGIN REJECTED ===', [
                'reason' => ! $user ? 'user_not_found' : 'password_mismatch',
                'identitas_input' => $identitas,
            ]);

            throw ValidationException::withMessages([
                'identitas' => ['Kredensial yang diberikan tidak cocok dengan data kami.'],
            ]);
        }

        Auth::login($user, $remember);

        return $user;
    }

    /**
     * Logika untuk Login menggunakan Google (SSO).
     */
    public function handleGoogleLogin(SocialiteUser $googleUser): User
    {
        $user = $this->userRepository->findByGoogleId($googleUser->getId());

        if (! $user) {
            $user = $this->userRepository->findByEmail($googleUser->getEmail());

            if ($user) {
                $user->update(['google_id' => $googleUser->getId()]);
            } else {
                $email = (string) $googleUser->getEmail();
                $usernameLokal = explode('@', $email)[0].rand(100, 999);

                $user = $this->userRepository->createClient([
                    'name' => $googleUser->getName(),
                    'email' => $email,
                    'username' => $usernameLokal,
                    'google_id' => $googleUser->getId(),
                    'password' => null,
                ]);
            }
        }

        Auth::login($user);

        return $user;
    }

    /**
     * Logika Logout & menghapus sesi beserta cookie "remember me".
     *
     * Menghapus cookie remember_web_* sangat penting karena
     * `Auth::logout()` dan `session()->invalidate()` TIDAK
     * menghapus cookie tersebut. Tanpa penghapusan, browser akan
     * auto-login ulang dari cookie, menyebabkan redirect loop
     * setelah logout.
     */
    public function logout(): void
    {
        $user = Auth::user();

        Log::info('=== AUTH SERVICE: LOGOUT ===', [
            'user_id' => $user?->id,
            'user_email' => $user?->email,
        ]);

        Auth::logout();

        request()->session()->invalidate();
        request()->session()->regenerateToken();

        $this->forgetRememberCookie();
    }

    /**
     * Hapus semua cookie "remember me" yang di-set oleh Laravel.
     *
     * Laravel menamai cookie remember sebagai:
     *   remember_<guard>_<sha1(provider_class)>
     *
     * Alih-alih menghitung hash, kita iterasi semua cookie yang
     * diawali "remember_" agar aman untuk berbagai guard/provider.
     */
    private function forgetRememberCookie(): void
    {
        foreach (request()->cookies->all() as $name => $value) {
            if (str_starts_with($name, 'remember_')) {
                Cookie::queue(Cookie::forget($name));
            }
        }
    }
}