<?php

namespace App\Services\User;

use App\Models\User;
use App\Repositories\Contracts\UserRepositoryInterface;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class PasswordService
{
    public function __construct(
        protected UserRepositoryInterface $userRepository,
    ) {}

    /**
     * Ganti password dengan verifikasi password lama.
     *
     * @throws ValidationException
     */
    public function changePassword(User $user, string $oldPassword, string $newPassword): void
    {
        if (! Hash::check($oldPassword, $user->password)) {
            throw ValidationException::withMessages([
                'old_password' => ['Password lama tidak sesuai.'],
            ]);
        }

        $this->userRepository->updatePassword($user, $newPassword);

        Log::info('User ganti password', [
            'user_id' => $user->id,
        ]);
    }

    /**
     * Ganti password tanpa verifikasi password lama.
     *
     * Digunakan saat `must_change_password = true` (wajib ganti password).
     *
     * @throws ValidationException
     */
    public function forceChangePassword(User $user, string $newPassword): void
    {
        if (! $user->must_change_password) {
            throw ValidationException::withMessages([
                'password' => ['User tidak dalam status wajib ganti password.'],
            ]);
        }

        $this->userRepository->updatePassword($user, $newPassword);

        Log::info('User wajib ganti password', [
            'user_id' => $user->id,
        ]);
    }

    // ============================================================
    // 🆕 METHOD BARU
    // ============================================================

    /**
     * Handle ganti password (wajib / biasa) + tentukan aksi setelahnya.
     *
     * - Wajib ganti (must_change_password = true) → tanpa verifikasi password lama
     * - Ganti biasa (must_change_password = false) → verifikasi password lama
     *
     * @return array{
     *     was_forced: bool,
     *     should_logout: bool,
     *     message: string,
     * }
     *
     * @throws ValidationException
     */
    public function handleChangePassword(
        User $user,
        ?string $oldPassword,
        string $newPassword,
    ): array {
        $wasForced = (bool) $user->must_change_password;

        if ($wasForced) {
            $this->forceChangePassword($user, $newPassword);
        } else {
            $this->changePassword($user, (string) $oldPassword, $newPassword);
        }

        return [
            'was_forced' => $wasForced,
            'should_logout' => $wasForced,
            'message' => $wasForced
                ? 'Password berhasil diubah. Silakan login ulang dengan password baru Anda.'
                : 'Password berhasil diubah.',
        ];
    }
}
