<?php

namespace App\Services\User;

use App\Models\Profile;
use App\Models\User;
use App\Repositories\Contracts\ProfileRepositoryInterface;
use App\Repositories\Contracts\UserRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class UserService
{
    public function __construct(
        protected UserRepositoryInterface $userRepository,
        protected ProfileRepositoryInterface $profileRepository,
    ) {}

    /**
     * Buat user baru dengan role admin.
     *
     * @param  array<string, mixed>  $data
     * @return array{user: User, plain_password: string}
     *
     * @throws ValidationException
     */
    public function createAdmin(array $data): array
    {
        $this->validateUnique($data);

        $plainPassword = $data['password'] ?? $this->generatePassword();

        $user = DB::transaction(function () use ($data, $plainPassword) {
            $user = $this->userRepository->createUser([
                'name' => $data['name'],
                'username' => $data['username'] ?? null,
                'email' => $data['email'],
                'password' => $plainPassword,
                'role' => 'admin',
                'must_change_password' => true,
            ]);

            $this->profileRepository->createForUser($user, [
                'tipe' => 'admin',
                'nama_penyedia_usaha' => $data['nama_penyedia_usaha'] ?? null,
                'nomor_identitas' => $data['nomor_identitas'] ?? null,
                'alamat' => $data['alamat'] ?? null,
                'telepon' => $data['telepon'] ?? null,
                'provinsi' => $data['provinsi'] ?? null,
                'kota' => $data['kota'] ?? null,
                'kode_pos' => $data['kode_pos'] ?? null,
                'logo' => $data['logo'] ?? null,
                'deskripsi' => $data['deskripsi'] ?? null,
            ]);

            return $user;
        });

        Log::info('User admin baru dibuat', [
            'user_id' => $user->id,
            'email' => $user->email,
        ]);

        return [
            'user' => $user,
            'plain_password' => $plainPassword,
        ];
    }

    /**
     * Buat user baru dengan role mitra.
     *
     * @param  array<string, mixed>  $data
     * @return array{user: User, plain_password: string}
     *
     * @throws ValidationException
     */
    public function createMitra(array $data): array
    {
        $this->validateUnique($data);

        $plainPassword = $data['password'] ?? $this->generatePassword();

        $user = DB::transaction(function () use ($data, $plainPassword) {
            $user = $this->userRepository->createUser([
                'name' => $data['name'],
                'username' => $data['username'] ?? null,
                'email' => $data['email'],
                'password' => $plainPassword,
                'role' => 'mitra',
                'must_change_password' => true,
            ]);

            $this->profileRepository->createForUser($user, [
                'tipe' => 'mitra',
                'nama_penyedia_usaha' => $data['nama_penyedia_usaha'] ?? null,
                'nomor_identitas' => $data['nomor_identitas'] ?? null,
                'alamat' => $data['alamat'] ?? null,
                'telepon' => $data['telepon'] ?? null,
                'provinsi' => $data['provinsi'] ?? null,
                'kota' => $data['kota'] ?? null,
                'kode_pos' => $data['kode_pos'] ?? null,
                'logo' => $data['logo'] ?? null,
                'deskripsi' => $data['deskripsi'] ?? null,
            ]);

            return $user;
        });

        Log::info('User mitra baru dibuat', [
            'user_id' => $user->id,
            'email' => $user->email,
        ]);

        return [
            'user' => $user,
            'plain_password' => $plainPassword,
        ];
    }

    /**
     * Update data user (dan profile jika ada).
     *
     * @param  array<string, mixed>  $data
     * @param  array<string, mixed>  $profileData
     *
     * @throws ValidationException
     */
    public function updateUser(User $user, array $data, array $profileData = []): User
    {
        $this->validateUnique($data, $user->id);

        return DB::transaction(function () use ($user, $data, $profileData) {
            // 1. Update data user
            $this->userRepository->updateUser($user, [
                'name' => $data['name'] ?? $user->name,
                'username' => $data['username'] ?? $user->username,
                'email' => $data['email'] ?? $user->email,
            ]);

            // 2. Eager load profile (fresh dari DB)
            $user->load('profile');

            // 3. Update atau buat profile kalau ada data
            if (! empty($profileData)) {
                // ✅ FIX PHPStan: narrow `$user->profile` ke `Profile|null`
                // via docblock @var (karena HasOne<Profile, $this>).
                /** @var Profile|null $profile */
                $profile = $user->profile;

                if ($profile instanceof Profile) {
                    $this->profileRepository->updateProfile($profile, $profileData);
                } else {
                    $this->profileRepository->createForUser($user, array_merge(
                        ['tipe' => $user->role],
                        $profileData
                    ));
                }
            }

            // 4. Return user dengan profile fresh
            return $user->refresh()->load('profile');
        });
    }

    /**
     * Hapus user (cascade profile).
     */
    public function deleteUser(User $user): void
    {
        DB::transaction(function () use ($user) {   // ✅ Transaction atomic
            // 1. Hapus relasi RESTRICT (wajib manual)
            $user->payouts()->delete();
            $user->tripMitras()->delete();
            $user->mitraWallet()?->delete();

            // 2. Hapus relasi non-cascade
            $user->dailyReports()->each(function ($report) {
                $report->media()->delete();
                $report->delete();
            });

            // 3. Hapus user
            $this->userRepository->deleteUser($user);

            // 4. Log SETELAH sukses
            Log::info('User dihapus oleh admin', [
                'user_id' => $user->id,
                'email' => $user->email,
                'role' => $user->role,
                'admin_id' => auth()->id(),
            ]);
        });
    }

    /**
     * Reset password user, return password baru (plain text).
     *
     * @return array{user: User, plain_password: string}
     */
    public function resetPassword(User $user): array
    {
        $plainPassword = $this->generatePassword();

        $user->update([
            'password' => $plainPassword,
            'must_change_password' => true,
        ]);

        Log::info('Password user direset oleh admin', [
            'user_id' => $user->id,
            'email' => $user->email,
        ]);

        return [
            'user' => $user->refresh(),
            'plain_password' => $plainPassword,
        ];
    }

    /**
     * Ambil daftar user berdasarkan role (untuk admin).
     *
     * @param  array<int, string>  $roles
     * @return LengthAwarePaginator<int, User>
     */
    public function paginateByRoles(
        array $roles,
        int $perPage = 15,
        ?string $search = null,
    ): LengthAwarePaginator {
        return $this->userRepository->paginateByRoles($roles, $perPage, $search);
    }

    /**
     * Ambil daftar client (untuk admin, read-only).
     *
     * @return LengthAwarePaginator<int, User>
     */
    public function paginateClients(
        int $perPage = 15,
        ?string $search = null,
    ): LengthAwarePaginator {
        return $this->userRepository->paginateClients($perPage, $search);
    }

    /**
     * Generate password acak yang aman.
     */
    protected function generatePassword(int $length = 12): string
    {
        return Str::password($length, symbols: true);
    }

    /**
     * Validasi unique email & username.
     *
     * @param  array<string, mixed>  $data
     *
     * @throws ValidationException
     */
    protected function validateUnique(array $data, ?int $exceptUserId = null): void
    {
        if (isset($data['email']) && $this->userRepository->emailExists($data['email'], $exceptUserId)) {
            throw ValidationException::withMessages([
                'email' => ['Email sudah digunakan.'],
            ]);
        }

        if (! empty($data['username']) && $this->userRepository->usernameExists($data['username'], $exceptUserId)) {
            throw ValidationException::withMessages([
                'username' => ['Username sudah digunakan.'],
            ]);
        }
    }
}
